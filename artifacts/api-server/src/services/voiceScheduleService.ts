import { db, scheduledMessages, voiceReminders, messages, users } from "@workspace/db";
import { lte, eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { PushService } from "./pushService";

export class VoiceScheduleService {
  private static intervalId: NodeJS.Timeout | null = null;

  static init() {
    // Run every minute
    this.intervalId = setInterval(() => this.processPendingItems(), 60 * 1000);
    logger.info("VoiceScheduleService initialized.");
    
    // run immediately once
    this.processPendingItems();
  }

  static async processPendingItems() {
    try {
      const now = new Date();

      // Process Scheduled Messages
      const pendingSchedules = await db.select().from(scheduledMessages)
        .where(and(
          eq(scheduledMessages.status, "pending"),
          lte(scheduledMessages.scheduledFor, now)
        ));

      for (const item of pendingSchedules) {
        // Find patient context ID (assume it's the receiver's linked patient or receiver themselves)
        const [recipient] = await db.select().from(users).where(eq(users.id, item.recipientId));
        if (!recipient) continue;
        const patientContextId = recipient.linkedPatientId || recipient.id;

        // Create the actual message
        await db.insert(messages).values({
          senderId: item.senderId,
          receiverId: item.recipientId,
          patientContextId,
          text: item.message,
          // audioBase64 would go here if we stored it in scheduled_messages
        });

        // Notify recipient
        if (recipient.pushToken) {
          await PushService.sendPushNotification(
            recipient.pushToken,
            "Scheduled Message",
            item.message,
            { type: "chat" }
          );
        }

        await db.update(scheduledMessages)
          .set({ status: "delivered", deliveredAt: new Date() })
          .where(eq(scheduledMessages.id, item.id));
      }

      // Process Voice Reminders
      const pendingReminders = await db.select().from(voiceReminders)
        .where(and(
          eq(voiceReminders.status, "pending"),
          lte(voiceReminders.scheduledFor, now)
        ));

      for (const item of pendingReminders) {
        const [recipient] = await db.select().from(users).where(eq(users.id, item.recipientId));
        if (recipient?.pushToken) {
          await PushService.sendPushNotification(
            recipient.pushToken,
            "Voice Reminder",
            item.transcript,
            { type: "voice_reminder", audioBase64: item.audioBase64 }
          );
        }

        await db.update(voiceReminders)
          .set({ status: "delivered" })
          .where(eq(voiceReminders.id, item.id));
      }

    } catch (error) {
      logger.error({ err: error }, "VoiceScheduleService failed");
    }
  }

  static stop() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}
