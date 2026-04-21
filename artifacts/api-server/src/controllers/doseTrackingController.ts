import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { DoseTrackingService } from "../services/doseTrackingService";

/**
 * Dose tracking controller.
 * Provides adherence statistics and auto-missed-dose marking.
 */
export class DoseTrackingController {
  static async getAdherenceStats(req: AuthRequest, res: Response) {
    if (!req.user?.linkedPatientId) {
      return res.json({
        success: true,
        data: { total: 0, taken: 0, missed: 0, pending: 0, snoozed: 0, adherencePercent: 0 },
      });
    }

    try {
      const stats = await DoseTrackingService.getAdherenceStats(req.user.linkedPatientId);
      res.json({ success: true, data: stats });
    } catch {
      res.status(500).json({ success: false, message: "Failed to get adherence stats" });
    }
  }

  static async markMissedDoses(req: AuthRequest, res: Response) {
    if (!req.user?.linkedPatientId) {
      return res.status(403).json({ success: false, message: "No linked patient" });
    }

    try {
      const markedCount = await DoseTrackingService.markMissedDoses(req.user.linkedPatientId);
      res.json({ success: true, data: { markedCount } });
    } catch {
      res.status(500).json({ success: false, message: "Failed to mark missed doses" });
    }
  }
}
