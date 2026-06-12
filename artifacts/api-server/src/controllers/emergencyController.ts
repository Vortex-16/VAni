import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { EmergencyService } from "../services/emergencyService";

export class EmergencyController {
  static async triggerEmergency(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(403).json({ error: "Unauthorized" });
    
    try {
      const alert = await EmergencyService.logEmergency(req.user.id);
      return res.json({ success: true, alert });
    } catch {
      return res.status(500).json({ error: "Failed to trigger emergency alert" });
    }
  }

  static async getEmergencies(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(403).json({ error: "Unauthorized" });
    const alerts = await EmergencyService.getEmergencies(req.user.id);
    return res.json({ alerts });
  }

  static async sendEmergencyReport(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(403).json({ error: "Unauthorized" });
    try {
      const { symptoms, medicines, location } = req.body;
      console.log(`[EmergencyController] SOS Report received for user ${req.user.id}:`, { symptoms, medicines, location });
      
      const dispatchId = `AMB-${Math.floor(1000 + Math.random() * 9000)}`;
      const etaMinutes = Math.floor(5 + Math.random() * 10);
      
      return res.json({
        success: true,
        message: "Ambulance dispatched.",
        dispatchId,
        etaMinutes,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      return res.status(500).json({ error: "Failed to process emergency report" });
    }
  }
}
