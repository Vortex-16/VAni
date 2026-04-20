import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { RecoveryService } from "../services/recoveryService";

/**
 * Recovery tracking controller.
 * Handles daily recovery log CRUD, trend analysis, and health alerts.
 */
export class RecoveryController {
  static async upsertRecoveryLog(req: AuthRequest, res: Response) {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const { logDate, painLevel, energyLevel, fever, feverTemp, notes } = req.body;

      if (!logDate) {
        return res.status(400).json({ success: false, message: "logDate is required" });
      }

      if (painLevel !== undefined && (painLevel < 0 || painLevel > 10)) {
        return res.status(400).json({
          success: false,
          message: "painLevel must be between 0 and 10",
        });
      }

      if (energyLevel !== undefined && (energyLevel < 0 || energyLevel > 10)) {
        return res.status(400).json({
          success: false,
          message: "energyLevel must be between 0 and 10",
        });
      }

      const log = await RecoveryService.upsertRecoveryLog(req.user.id, {
        logDate,
        painLevel,
        energyLevel,
        fever,
        feverTemp,
        notes,
      });

      res.json({ success: true, data: log });
    } catch {
      res.status(500).json({ success: false, message: "Failed to save recovery log" });
    }
  }

  static async getRecoveryLogs(req: AuthRequest, res: Response) {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      const logs = await RecoveryService.getRecoveryLogs(req.user.id, days);
      res.json({ success: true, data: logs });
    } catch {
      res.status(500).json({ success: false, message: "Failed to get recovery logs" });
    }
  }

  static async getRecoveryTrends(req: AuthRequest, res: Response) {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const trends = await RecoveryService.getRecoveryTrends(req.user.id);
      res.json({ success: true, data: trends });
    } catch {
      res.status(500).json({ success: false, message: "Failed to get recovery trends" });
    }
  }

  static async getAlerts(req: AuthRequest, res: Response) {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const alerts = await RecoveryService.detectAlerts(req.user.id);
      res.json({ success: true, data: alerts });
    } catch {
      res.status(500).json({ success: false, message: "Failed to detect alerts" });
    }
  }
}
