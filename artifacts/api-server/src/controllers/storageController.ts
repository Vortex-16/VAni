import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { StorageService } from "../services/storageService";

/**
 * Data storage controller.
 * Handles prescription storage and user profile endpoints.
 */
export class StorageController {
  static async savePrescription(req: AuthRequest, res: Response) {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const { imageUrl, rawText, extractedData } = req.body;

      const prescription = await StorageService.savePrescription(req.user.id, {
        imageUrl,
        rawText,
        extractedData,
      });

      res.json({ success: true, data: { prescription } });
    } catch {
      res.status(500).json({ success: false, message: "Failed to save prescription" });
    }
  }

  static async getPrescriptionHistory(req: AuthRequest, res: Response) {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const prescriptions = await StorageService.getUserPrescriptions(req.user.id);
      res.json({ success: true, data: prescriptions });
    } catch {
      res.status(500).json({ success: false, message: "Failed to get prescriptions" });
    }
  }

  static async getUserProfile(req: AuthRequest, res: Response) {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const user = await StorageService.getUserProfile(req.user.id);
      res.json({ success: true, data: user });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to get profile";
      res.status(500).json({ success: false, message });
    }
  }
}
