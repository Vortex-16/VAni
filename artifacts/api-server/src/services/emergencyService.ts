import { db, emergencyAlerts, users, patients, careLinks, eq, and, inArray, desc } from "@workspace/db";
import { sendPushNotification } from "./notificationService";
import { logger } from "../lib/logger";

export class EmergencyService {
  static async logEmergency(userId: string) {
    const [alert] = await db.insert(emergencyAlerts).values({
      userId,
      status: "active"
    }).returning();

    // Notify the patient's linked caregivers / family. Best-effort: a push
    // failure must never make the emergency itself fail.
    this.notifyManagers(userId).catch((err) =>
      logger.error({ err, userId }, "Emergency notification failed")
    );

    return alert;
  }

  // Push an emergency alert to every active caregiver/family member linked to
  // the patient who triggered it.
  private static async notifyManagers(triggeringUserId: string) {
    const [actor] = await db.select().from(users).where(eq(users.id, triggeringUserId));
    if (!actor) return;

    const patientContextId = actor.linkedPatientId;
    if (!patientContextId) {
      logger.warn({ userId: triggeringUserId }, "Emergency: user has no linked patient; no managers to notify");
      return;
    }

    const managerIds = new Set<string>();

    // Active care_links (caregiver + family).
    const links = await db
      .select({ managerId: careLinks.managerId })
      .from(careLinks)
      .where(and(eq(careLinks.patientId, patientContextId), eq(careLinks.status, "active")));
    for (const l of links) managerIds.add(l.managerId);

    // Legacy single-caregiver link on the patient record.
    const [patientRecord] = await db
      .select({ caregiverId: patients.caregiverId })
      .from(patients)
      .where(eq(patients.id, patientContextId));
    if (patientRecord?.caregiverId) managerIds.add(patientRecord.caregiverId);

    // Legacy managers carrying only users.linkedPatientId.
    const legacy = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.linkedPatientId, patientContextId), inArray(users.role, ["caregiver", "family"])));
    for (const m of legacy) managerIds.add(m.id);

    managerIds.delete(triggeringUserId);
    if (managerIds.size === 0) {
      logger.warn({ patientContextId }, "Emergency: no linked managers to notify");
      return;
    }

    const managers = await db
      .select({ id: users.id, pushToken: users.pushToken })
      .from(users)
      .where(inArray(users.id, [...managerIds]));

    const title = "🚨 Emergency Alert";
    const body = `${actor.name} triggered an emergency alert. Please check on them immediately.`;

    await Promise.all(
      managers
        .filter((m) => !!m.pushToken)
        .map((m) =>
          sendPushNotification(m.pushToken!, {
            title,
            body,
            data: { type: "emergency", patientUserId: triggeringUserId, patientContextId },
          }).catch((err) => logger.error({ err, managerId: m.id }, "Emergency push to manager failed"))
        )
    );

    logger.info({ patientContextId, notified: managers.length }, "Emergency alert dispatched to managers");
  }

  static async getEmergencies(userId: string) {
    return await db.select()
      .from(emergencyAlerts)
      .where(eq(emergencyAlerts.userId, userId))
      .orderBy(desc(emergencyAlerts.timestamp));
  }
}
