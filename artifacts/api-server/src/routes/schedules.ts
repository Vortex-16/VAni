import { Router, Response } from "express";
import { db, scheduledMessages, voiceReminders, users } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { AuthRequest } from "../middlewares/auth";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();
router.use(requireAuth);

/**
 * POST /api/schedules
 * Schedule a new message or reminder
 */
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const { recipientId, message, audioBase64, transcript, type, scheduledFor, recurrence } = req.body;

    if (!recipientId || !scheduledFor) {
      return res.status(400).json({ error: "recipientId and scheduledFor are required" });
    }

    if (type === "voice_reminder") {
      if (!audioBase64 || !transcript) return res.status(400).json({ error: "audioBase64 and transcript required for voice reminder" });
      
      const [newReminder] = await db.insert(voiceReminders).values({
        senderId,
        recipientId,
        audioBase64,
        transcript,
        scheduleType: recurrence ? "RECURRING" : "ONCE",
        scheduledFor: new Date(scheduledFor),
        recurrence,
        status: "pending"
      }).returning();
      
      return res.json({ success: true, item: newReminder });
    } else {
      if (!message) return res.status(400).json({ error: "message is required for scheduled message" });

      const [newSchedule] = await db.insert(scheduledMessages).values({
        senderId,
        recipientId,
        message,
        voiceEnabled: !!audioBase64,
        scheduleType: recurrence ? "RECURRING" : "ONCE",
        scheduledFor: new Date(scheduledFor),
        recurrence,
        status: "pending"
      }).returning();
      
      return res.json({ success: true, item: newSchedule });
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to schedule item");
    return res.status(500).json({ error: "Failed to schedule item" });
  }
});

/**
 * GET /api/schedules
 * List my scheduled items
 */
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    
    const schedules = await db.select().from(scheduledMessages).where(eq(scheduledMessages.senderId, senderId));
    const reminders = await db.select().from(voiceReminders).where(eq(voiceReminders.senderId, senderId));
    
    return res.json({ schedules, reminders });
  } catch (error) {
    logger.error({ err: error }, "Failed to list schedules");
    return res.status(500).json({ error: "Failed to list schedules" });
  }
});

export default router;
