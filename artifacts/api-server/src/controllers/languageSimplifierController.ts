import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { LanguageSimplifierService } from "../services/languageSimplifierService";

/**
 * Language simplifier controller.
 * Handles medical text simplification and abbreviation lookups.
 */
export class LanguageSimplifierController {
  static async simplifyText(req: AuthRequest, res: Response) {
    try {
      const { text } = req.body;
      if (!text || text.trim() === "") {
        return res.status(400).json({ success: false, message: "text is required" });
      }

      const result = await LanguageSimplifierService.simplifyInstruction(text);
      res.json({ success: true, data: result });
    } catch {
      res.status(500).json({ success: false, message: "Failed to simplify text" });
    }
  }

  static async lookupTerm(req: AuthRequest, res: Response) {
    try {
      const term = req.query.term as string;
      if (!term) {
        return res.status(400).json({
          success: false,
          message: "term query parameter is required",
        });
      }

      const meaning = await LanguageSimplifierService.lookupAbbreviation(term);
      if (!meaning) {
        return res.status(404).json({ success: false, message: "Term not found" });
      }

      res.json({ success: true, data: { term, meaning } });
    } catch {
      res.status(500).json({ success: false, message: "Failed to lookup term" });
    }
  }
}
