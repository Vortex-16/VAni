import { Router } from "express";
import { db, feedback } from "@workspace/db";
import { z } from "zod";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "general"]),
  message: z.string().min(1)
});

router.post("/feedback", requireAuth, async (req, res) => {
  try {
    const { type, message } = feedbackSchema.parse(req.body);
    const userId = (req as any).user.id;

    const [newFeedback] = await db.insert(feedback)
      .values({
        userId,
        type,
        message
      })
      .returning();

    logger.info({ userId, feedbackId: newFeedback.id }, "User feedback submitted.");
    res.json({ success: true, feedback: newFeedback });
  } catch (err: any) {
    logger.error({ err }, "Feedback submission failed.");
    res.status(400).json({ error: err.message || "Failed to submit feedback" });
  }
});

export default router;
