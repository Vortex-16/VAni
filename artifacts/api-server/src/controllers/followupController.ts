import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { FollowupService } from "../services/followupService";

/**
 * Follow-up management controller.
 * Handles CRUD operations for user-level follow-up appointments.
 */
export class FollowupController {
  static async createFollowup(req: AuthRequest, res: Response) {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const { type, title, scheduledDate, dateTime, doctorName, reminderDaysBefore, notes } = req.body;
      const actualDate = scheduledDate || dateTime;

      if (!actualDate || !title) {
        return res.status(400).json({
          success: false,
          message: "title and scheduledDate (or dateTime) are required",
        });
      }

      const followup = await FollowupService.createFollowup(req.user.id, {
        type: type || "appointment",
        title,
        scheduledDate: new Date(actualDate),
        reminderDaysBefore,
        notes: notes || (doctorName ? `Doctor: ${doctorName}` : undefined),
      });

      return res.json({ success: true, data: followup });
    } catch {
      return res.status(500).json({ success: false, message: "Failed to create followup" });
    }
  }

  static async getFollowups(req: AuthRequest, res: Response) {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const status = req.query.status as "upcoming" | "completed" | "missed" | undefined;
      const followups = await FollowupService.getFollowups(req.user.id, status);
      return res.json({ success: true, data: followups });
    } catch (err: unknown) {
      console.error("[FollowupController] Error fetching followups:", err);
      const message = err instanceof Error ? err.message : "Failed to get followups";
      return res.status(500).json({ success: false, message });
    }
  }

  static async updateFollowupStatus(req: AuthRequest, res: Response) {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const id = req.params.id as string;
      const { status } = req.body;

      if (status !== "completed" && status !== "missed") {
        return res.status(400).json({
          success: false,
          message: "Status must be 'completed' or 'missed'",
        });
      }

      const updated = await FollowupService.updateFollowupStatus(id, req.user.id, status);
      return res.json({ success: true, data: updated });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update followup";
      return res.status(500).json({ success: false, message });
    }
  }

  static async deleteFollowup(req: AuthRequest, res: Response) {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const id = req.params.id as string;
      await FollowupService.deleteFollowup(id, req.user.id);
      return res.json({ success: true, message: "Deleted" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete followup";
      return res.status(500).json({ success: false, message });
    }
  }
}
