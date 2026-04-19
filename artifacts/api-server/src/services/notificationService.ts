import { Expo, ExpoPushMessage } from "expo-server-sdk";
import cron from "node-cron";
import { db, users, doseLogs, medicines, patients } from "@workspace/db";
import { eq, and, lte, gte, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";

const expo = new Expo();

/**
 * Service to handle scanning and sending push notifications for medication reminders
 */
export const NotificationService = {
  /**
   * Scans for upcoming medication doses in the next few minutes and sends notifications
   */
  async scanAndSendReminders() {
    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      
      // Get current time in HH:mm format
      const currentTime = now.toTimeString().split(" ")[0].substring(0, 5);
      
      logger.debug({ currentTime, today }, "Scanning for medication reminders...");

      // 1. Find all pending doses scheduled for RIGHT NOW
      // In a real app, you might want a window (e.g., +/- 1 minute)
      const upcomingDoses = await db.select({
        doseId: doseLogs.id,
        medicineName: medicines.name,
        dosage: medicines.dosage,
        time: doseLogs.scheduledTime,
        patientId: medicines.patientId,
      })
      .from(doseLogs)
      .innerJoin(medicines, eq(doseLogs.medicineId, medicines.id))
      .where(
        and(
          eq(doseLogs.date, today),
          eq(doseLogs.scheduledTime, currentTime),
          eq(doseLogs.status, "pending")
        )
      );

      if (upcomingDoses.length === 0) return;

      logger.info({ count: upcomingDoses.length }, "Found upcoming doses to notify");

      // 2. Map doses to their users/push tokens
      // First, get all unique patient IDs
      const patientIds = [...new Set(upcomingDoses.map(d => d.patientId))];
      
      // Find the users (caregivers or patients) associated with these patient IDs
      // Typically we notify the user who "owns" the patient record
      const subscribers = await db.select({
        userId: users.id,
        pushToken: users.pushToken,
        linkedPatientId: users.linkedPatientId,
      })
      .from(users)
      .where(
        and(
          inArray(users.linkedPatientId, patientIds),
          // Only users with a valid push token
          lte(users.pushToken, "") // This is just a placeholder logic, we'll check token validity later
        )
      );
      
      // Re-fetch with a better filter because lte check is a placeholder
      const usersWithTokens = await db.select()
        .from(users)
        .where(inArray(users.linkedPatientId, patientIds));

      const messages: ExpoPushMessage[] = [];

      for (const dose of upcomingDoses) {
        // Find users linked to this patient
        const targetUsers = usersWithTokens.filter(u => u.linkedPatientId === dose.patientId && u.pushToken);

        for (const user of targetUsers) {
          if (!Expo.isExpoPushToken(user.pushToken)) {
            logger.warn({ token: user.pushToken, userId: user.id }, "Invalid Expo push token");
            continue;
          }

          messages.push({
            to: user.pushToken!,
            sound: "default",
            title: "💊 Medication Reminder",
            body: `Time to take ${dose.medicineName} (${dose.dosage})`,
            data: { doseId: dose.doseId, type: "medication_reminder" },
          });
        }
      }

      if (messages.length === 0) return;

      // 3. Send the chunks to Expo
      const chunks = expo.chunkPushNotifications(messages);
      const tickets = [];
      
      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          logger.error({ err: error }, "Error sending notification chunk");
        }
      }

      logger.info({ tickets: tickets.length }, "Notifications sent successfully");

    } catch (error) {
      logger.error({ err: error }, "Medication Scanner Error");
    }
  },

  /**
   * Initializes the notification cron engine
   */
  init() {
    logger.info("Initializing Notification Engine...");
    
    // Run every minute: * * * * *
    cron.schedule("* * * * *", () => {
      this.scanAndSendReminders();
    });

    logger.info("Notification Cron Job started (every minute)");
  }
};
