import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { EmergencyService } from "../services/emergencyService";

export class EmergencyController {
  static async triggerEmergency(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(403).json({ error: "Unauthorized" });
    
    try {
      const alert = await EmergencyService.logEmergency(req.user.id);
      res.json({ success: true, alert });
    } catch {
      res.status(500).json({ error: "Failed to trigger emergency alert" });
    }
  }

  static async getEmergencies(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(403).json({ error: "Unauthorized" });
    const alerts = await EmergencyService.getEmergencies(req.user.id);
    res.json({ alerts });
  }
}
