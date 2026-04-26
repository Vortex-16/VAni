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
      
      // If dose is taken, notify the caregiver
      if (status === "taken") {
        const { NotificationService } = require("../services/notificationService");
        NotificationService.sendDoseTakenNotification(id).catch((e: any) => {
           console.error("Failed to notify caregiver about taken dose:", e);
        });
      }

      res.json({ doseLog: updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to update dose" });
    }
  }

  static async addMedicine(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.linkedPatientId) {
        return res.status(400).json({ error: "No patient linked to this user" });
      }

      const medicine = await MedicineService.addMedicine(
        req.user.linkedPatientId,
        req.body
      );

      res.status(201).json(medicine);
    } catch (error: any) {
      console.error("[MedicineController] Add failed. Request body:", req.body);
      console.error("[MedicineController] Error detail:", error);
      res.status(500).json({ error: "Failed to add medicine", detail: error.message });
    }
  }

  static async updateMedicine(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const updated = await MedicineService.updateMedicine(id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update medicine" });
    }
  }

  static async deleteMedicine(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      await MedicineService.deleteMedicine(id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete medicine" });
    }
  }

  static async getAdherenceHistory(req: AuthRequest, res: Response) {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      const history = await MedicineService.getAdherenceHistory(req.user.id, isNaN(days) ? 30 : days);
      res.json({ success: true, history });
    } catch {
      res.status(500).json({ success: false, message: "Failed to get adherence history" });
    }
  }
}
