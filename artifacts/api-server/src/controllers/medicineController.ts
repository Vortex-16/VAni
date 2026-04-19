import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { MedicineService } from "../services/medicineService";

export class MedicineController {
  static async getMedicines(req: AuthRequest, res: Response) {
    if (!req.user?.linkedPatientId) return res.json({ medicines: [] });
    const userMedicines = await MedicineService.getUserMedicines(req.user.linkedPatientId);
    res.json({ medicines: userMedicines });
  }

  static async getTodayDoses(req: AuthRequest, res: Response) {
    if (!req.user?.linkedPatientId) return res.json({ doseLogs: [] });
    const logs = await MedicineService.getTodayDoses(req.user.linkedPatientId);
    res.json({ doseLogs: logs });
  }

  static async updateDoseStatus(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { status, snoozeMinutes } = req.body;
      
      if (!status) return res.status(400).json({ error: "Missing status" });
      
      const updated = await MedicineService.updateDoseStatus(id, status, snoozeMinutes);
      res.json({ doseLog: updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to update dose" });
    }
  }
}
