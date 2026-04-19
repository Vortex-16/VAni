import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { ActivityService } from "../services/activityService";

export class ActivityController {
  static async getSymptoms(req: AuthRequest, res: Response) {
    if (!req.user?.linkedPatientId) return res.json({ symptomLogs: [] });
    const logs = await ActivityService.getSymptoms(req.user.linkedPatientId);
    res.json({ symptomLogs: logs });
  }

  static async addSymptom(req: AuthRequest, res: Response) {
    if (!req.user?.linkedPatientId) return res.status(403).json({ error: "No linked patient" });
    try {
      const created = await ActivityService.addSymptom(req.user.linkedPatientId, req.body);
      res.json({ symptomLog: created });
    } catch {
      res.status(500).json({ error: "Failed to add symptom" });
    }
  }

  static async getJournal(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.json({ journalEntries: [] });
    const entries = await ActivityService.getJournals(req.user.id);
    res.json({ journalEntries: entries });
  }

  static async addJournal(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(403).json({ error: "Unauthorized" });
    try {
      const created = await ActivityService.addJournal(req.user.id, req.body);
      res.json({ journalEntry: created });
    } catch {
      res.status(500).json({ error: "Failed to add journal" });
    }
  }
}
