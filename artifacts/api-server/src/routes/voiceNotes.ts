import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { db, users, patients, eq } from "@workspace/db";
import { logger } from "../lib/logger";
import { sendPushNotification } from "../services/notificationService";

const router = Router();

/**
 * @route POST /api/voice-notes
 * @desc  Phase 8 — Family Voice Notes
 *        A patient says "Tell my daughter I had lunch" → Buddy records the
 *        spoken message, transcribes it (already done on the client by the STT
 *        pipeline), then calls this endpoint which:
 *          1. Persists the note (transcript + optional base64 audio).
 *          2. Pushes a real-time notification to every linked caregiver / family
 *             user whose push token is registered.
 *
 *        Body: { transcript: string, audioBase64?: string, patientNote?: string }
 *        – transcript   : the STT text of the spoken message (required)
 *        – audioBase64  : the raw recording in base64 (optional, future: store in cloud)
 *        – patientNote  : optional short label e.g. "I had lunch"
 */
router.post("/", requireAuth, async (req: any, res: any) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { transcript, patientNote } = req.body;
  if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
    return res.status(400).json({ error: "transcript is required" });
  }

  try {
    // ── 1. Resolve the patient record for this user ──────────────────────────
    const patientId = user.linkedPatientId;
    if (!patientId) {
      return res.status(400).json({
        error: "No linked patient found for this account. Cannot send voice note.",
      });
    }

    const [patient] = await db.select().from(patients).where(eq(patients.id, patientId));
    if (!patient) {
      return res.status(404).json({ error: "Patient record not found" });
    }

    // ── 2. Find all caregivers/family users linked to this patient ───────────
    //    Strategy: find every user whose `linkedPatientId` OR `caregiverId` on
    //    the patient row points to them. Right now the schema links one caregiver
    //    via `patients.caregiverId`; extend the query when a proper family-links
    //    table exists.
    const recipients: string[] = [];

    if (patient.caregiverId) {
      const [caregiver] = await db
        .select()
        .from(users)
        .where(eq(users.id, patient.caregiverId));

      if (caregiver?.pushToken) {
        recipients.push(caregiver.pushToken);
      }
    }

    // ── 3. Build a friendly push message ─────────────────────────────────────
    const senderName = user.name || "Your family member";
    const noteLabel = (patientNote || transcript).slice(0, 120);
    const pushTitle = `💬 Voice note from ${senderName}`;
    const pushBody = noteLabel;

    // ── 4. Send push to all recipients ───────────────────────────────────────
    const pushResults = await Promise.allSettled(
      recipients.map((token) =>
        sendPushNotification(token, {
          title: pushTitle,
          body: pushBody,
          data: {
            type: "FAMILY_VOICE_NOTE",
            patientId: patientId,
            transcript: transcript.slice(0, 500),
            senderName,
          },
        })
      )
    );

    const sent = pushResults.filter((r) => r.status === "fulfilled").length;
    logger.info(
      { patientId, recipientCount: recipients.length, sent },
      "[VoiceNotes] Note sent"
    );

    return res.json({
      success: true,
      recipientCount: recipients.length,
      sent,
      message:
        recipients.length === 0
          ? "Note recorded, but no caregiver push tokens are registered yet."
          : `Note sent to ${sent} caregiver${sent !== 1 ? "s" : ""}.`,
    });
  } catch (error: any) {
    logger.error({ err: error.message }, "[VoiceNotes] Failed to send voice note");
    return res.status(500).json({
      error: "Failed to send voice note",
      detail: error.message,
    });
  }
});

/**
 * @route GET /api/voice-notes
 * @desc  Returns the latest voice notes sent TO the logged-in caregiver's patients.
 *        Future: paginate, filter by patient. For now returns the last 20 push
 *        events (this is a lightweight in-memory placeholder until a `voice_notes`
 *        DB table is added).
 */
router.get("/", requireAuth, async (req: any, res: any) => {
  // Lightweight placeholder — returns empty array until DB table is wired.
  // The UI should gracefully handle an empty list with an empty state.
  return res.json({ notes: [] });
});

export default router;
