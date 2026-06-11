import { Router, Response } from "express";
import { db, users, patients, messages, careLinks } from "@workspace/db";
import { eq, or, and, asc, inArray } from "drizzle-orm";
import type { AuthRequest } from "../middlewares/auth";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { sendPushNotification } from "../services/notificationService";

const router = Router();

// ── Real-time transport ──────────────────────────────────────────────────────
// One user may have several live connections (phone + web). We therefore keep a
// SET of SSE responses per user, not a single response (the old code kept one,
// so a second device silently stole real-time delivery from the first).
const clients = new Map<string, Set<Response>>();

function pushToClients(userId: string, payload: unknown): boolean {
  const set = clients.get(userId);
  if (!set || set.size === 0) return false;
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  let delivered = false;
  for (const res of set) {
    try {
      res.write(line);
      delivered = true;
    } catch {
      set.delete(res);
    }
  }
  return delivered;
}

// ── Participant resolution ───────────────────────────────────────────────────
// A "conversation" is scoped to one patient (patientContextId). Its participants
// are: the patient user, plus every manager (caregiver/family) linked to that
// patient via care_links (active) or the legacy patients.caregiverId. We resolve
// the participant SET and validate against it — never fall back to "the first
// caregiver in the system" (the old code did, wiring strangers together).

async function getPatientUserId(patientContextId: string): Promise<string | null> {
  const [patientUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.linkedPatientId, patientContextId), eq(users.role, "patient")));
  return patientUser?.id ?? null;
}

// All manager user IDs linked to this patient (caregiver + family).
async function getManagerIds(patientContextId: string): Promise<string[]> {
  const ids = new Set<string>();

  const links = await db
    .select({ managerId: careLinks.managerId })
    .from(careLinks)
    .where(and(eq(careLinks.patientId, patientContextId), eq(careLinks.status, "active")));
  for (const l of links) ids.add(l.managerId);

  // Legacy single-caregiver link kept on the patient record.
  const [patientRecord] = await db
    .select({ caregiverId: patients.caregiverId })
    .from(patients)
    .where(eq(patients.id, patientContextId));
  if (patientRecord?.caregiverId) ids.add(patientRecord.caregiverId);

  // Legacy managers that only carry users.linkedPatientId (no care_link row yet).
  const legacyManagers = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.linkedPatientId, patientContextId), inArray(users.role, ["caregiver", "family", "doctor"])));
  for (const m of legacyManagers) ids.add(m.id);

  return [...ids];
}

interface Participants {
  patientUserId: string | null;
  managerIds: string[];
  all: Set<string>;
}

async function getParticipants(patientContextId: string): Promise<Participants> {
  const [patientUserId, managerIds] = await Promise.all([
    getPatientUserId(patientContextId),
    getManagerIds(patientContextId),
  ]);
  const all = new Set<string>(managerIds);
  if (patientUserId) all.add(patientUserId);
  return { patientUserId, managerIds, all };
}

/**
 * Resolve the receiver for an outgoing message.
 * - Honours an explicit, VALIDATED `requestedReceiverId` (this is how a patient
 *   replies to a *family* member rather than always hitting a caregiver — the
 *   bug the old role-based guess could never express).
 * - Otherwise falls back to a deterministic counterpart; returns a reason code
 *   instead of guessing when it's ambiguous.
 */
async function resolveReceiver(
  requesterId: string,
  parts: Participants,
  requestedReceiverId?: string,
): Promise<{ receiverId: string } | { error: string; status: number }> {
  if (!parts.all.has(requesterId)) {
    return { error: "You are not a participant in this conversation.", status: 403 };
  }

  if (requestedReceiverId) {
    if (requestedReceiverId === requesterId) {
      return { error: "Cannot message yourself.", status: 400 };
    }
    if (!parts.all.has(requestedReceiverId)) {
      return { error: "Receiver is not linked to this patient.", status: 400 };
    }
    return { receiverId: requestedReceiverId };
  }

  // If there is exactly one other participant in the context, default to them.
  const otherIds = [...parts.all].filter((id) => id !== requesterId);
  if (otherIds.length === 1) {
    return { receiverId: otherIds[0] };
  }

  // No explicit receiver and multiple other participants:
  const isPatient = requesterId === parts.patientUserId;
  if (isPatient) {
    if (parts.managerIds.length === 1) return { receiverId: parts.managerIds[0] };
    if (parts.managerIds.length === 0) {
      return { error: "No caregiver or family member is linked yet.", status: 400 };
    }
    return { error: "Multiple recipients linked — specify receiverId.", status: 400 };
  }

  // Requester is a manager → default to patient if they exist.
  if (parts.patientUserId) return { receiverId: parts.patientUserId };
  return { error: "Multiple recipients linked or no patient account — specify receiverId.", status: 400 };
}

// ── GET /api/chat/conversations ──
// Returns the conversations the authenticated user can take part in, each scoped
// to a patient context. The frontend calls this on entry to learn the correct
// `patientContextId` + peer instead of guessing from client state (a caregiver's
// own `linkedPatientId` is null, so guessing was unreliable). Always derived
// fresh from the DB, so it stays in sync once family/caregiver links change.
router.get("/conversations", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!;
    const conversations: Array<{
      patientContextId: string;
      patientName: string | null;
      peerId: string | null;
      peerName: string | null;
      peerRole: string | null;
    }> = [];

    if (me.role === "patient") {
      // A patient has one context (their own record) and one row per linked manager.
      const patientContextId = me.linkedPatientId;
      if (patientContextId) {
        const parts = await getParticipants(patientContextId);
        const [patient] = await db
          .select({ name: patients.name })
          .from(patients)
          .where(eq(patients.id, patientContextId));
        if (parts.managerIds.length === 0) {
          conversations.push({ patientContextId, patientName: patient?.name ?? null, peerId: null, peerName: null, peerRole: null });
        } else {
          const managers = await db
            .select({ id: users.id, name: users.name, role: users.role })
            .from(users)
            .where(inArray(users.id, parts.managerIds));
          for (const mgr of managers) {
            conversations.push({ patientContextId, patientName: patient?.name ?? null, peerId: mgr.id, peerName: mgr.name, peerRole: mgr.role });
          }
        }
      }
    } else {
      // A manager (caregiver/family/doctor) chats with each patient they manage or other managers.
      const managedIds = new Set<string>();
      const links = await db
        .select({ patientId: careLinks.patientId })
        .from(careLinks)
        .where(and(eq(careLinks.managerId, me.id), eq(careLinks.status, "active")));
      for (const l of links) managedIds.add(l.patientId);
      const legacy = await db
        .select({ id: patients.id })
        .from(patients)
        .where(eq(patients.caregiverId, me.id));
      for (const p of legacy) managedIds.add(p.id);

      for (const patientContextId of managedIds) {
        const [patient] = await db
          .select({ name: patients.name })
          .from(patients)
          .where(eq(patients.id, patientContextId));
        const parts = await getParticipants(patientContextId);
        
        const otherIds = [...parts.all].filter(id => id !== me.id);
        if (otherIds.length === 0) {
          conversations.push({
            patientContextId,
            patientName: patient?.name ?? null,
            peerId: null,
            peerName: null,
            peerRole: null,
          });
        } else {
          const peers = await db
            .select({ id: users.id, name: users.name, role: users.role })
            .from(users)
            .where(inArray(users.id, otherIds));
          for (const peer of peers) {
            conversations.push({
              patientContextId,
              patientName: patient?.name ?? null,
              peerId: peer.id,
              peerName: peer.name,
              peerRole: peer.role,
            });
          }
        }
      }
    }

    res.json({ conversations });
    return;
  } catch (err) {
    logger.error({ err }, "List Conversations Error");
    res.status(500).json({ error: "Failed to list conversations" });
    return;
  }
});

// ── GET /api/chat/stream ──
// Subscribe to Server-Sent Events for incoming messages.
router.get("/stream", requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  // Disable proxy buffering (nginx) so events flush immediately.
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  res.write(`data: {"type":"connected"}\n\n`);

  let set = clients.get(userId);
  if (!set) {
    set = new Set();
    clients.set(userId, set);
  }
  set.add(res);

  // Keepalive: comment pings stop idle proxies/load-balancers from dropping the
  // connection (after which the server would wrongly think the user is online
  // and skip the push fallback). Comments are ignored by EventSource.
  const heartbeat = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    const s = clients.get(userId);
    if (s) {
      s.delete(res);
      if (s.size === 0) clients.delete(userId);
    }
  });
});

// ── GET /api/chat/history/:patientContextId ──
// Optional ?withUserId= narrows to a single 1:1 thread (recommended when a
// patient has both a caregiver and a family member). Without it, returns every
// message in the patient context where the requester is a participant.
router.get("/history/:patientContextId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const patientContextId = String(req.params.patientContextId);
    const withUserId = typeof req.query.withUserId === "string" ? req.query.withUserId : undefined;

    const parts = await getParticipants(patientContextId);
    if (!parts.all.has(userId)) {
      return res.status(403).json([]);
    }

    const base = eq(messages.patientContextId, patientContextId);
    const scope = withUserId
      ? or(
          and(eq(messages.senderId, userId), eq(messages.receiverId, withUserId)),
          and(eq(messages.senderId, withUserId), eq(messages.receiverId, userId)),
        )
      : or(eq(messages.senderId, userId), eq(messages.receiverId, userId));

    const history = await db
      .select()
      .from(messages)
      .where(and(base, scope))
      .orderBy(asc(messages.createdAt));

    res.json(history);
    return;
  } catch (err) {
    logger.error({ err }, "Fetch Chat History Error");
    res.status(500).json({ error: "Failed to fetch history" });
    return;
  }
});

// ── POST /api/chat/send ──
router.post("/send", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const { patientContextId, receiverId: requestedReceiverId, text, audioBase64 } = req.body;

    if (!text && !audioBase64) {
      return res.status(400).json({ error: "message text or audio is required" });
    }
    if (!patientContextId) {
      return res.status(400).json({ error: "patientContextId is required" });
    }

    const parts = await getParticipants(patientContextId);
    const resolved = await resolveReceiver(senderId, parts, requestedReceiverId);
    if ("error" in resolved) {
      return res.status(resolved.status).json({ error: resolved.error });
    }
    const receiverId = resolved.receiverId;

    const [newMessage] = await db
      .insert(messages)
      .values({
        senderId,
        receiverId,
        patientContextId,
        text: text || "Voice Message",
        audioBase64,
      })
      .returning();

    // Deliver in real time to every live connection the receiver has; if none
    // are connected, fall back to a push notification.
    const deliveredLive = pushToClients(receiverId, { type: "message", data: newMessage });
    if (!deliveredLive) {
      const [receiver] = await db.select().from(users).where(eq(users.id, receiverId));
      if (receiver?.pushToken) {
        await sendPushNotification(receiver.pushToken, {
          title: `New message from ${req.user!.name}`,
          body: text || "Voice Message",
          data: { type: "chat", senderId, patientContextId },
        });
      }
    }

    res.json(newMessage);
    return;
  } catch (err) {
    logger.error({ err }, "Send Message Error");
    res.status(500).json({ error: "Failed to send message" });
    return;
  }
});

export default router;
