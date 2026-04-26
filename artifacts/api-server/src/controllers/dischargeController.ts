import { db, dischargePlans, patients } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { DischargeService } from "../services/dischargeService";
import { logger } from "../lib/logger";

export class DischargeController {
  /**
   * GET /api/discharge/:id
   * Fetches a plan for preview
   */
  static async getPlan(req: AuthRequest, res: Response) {
    const id = req.params.id;
    logger.info({ id, method: req.method }, "[DEBUG] Fetching plan");
    
    try {
      if (!req.user) {
        logger.error("[DEBUG] No user on request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      const userId = req.user.id;

      if (id === "dev") {
        const body = req.body || {};
        logger.info({ hasBodyData: !!body.data }, "[DEBUG] Dev mode normalization");
        const plan = await DischargeService.normalizePlan(userId, body.data);
        return res.json({ data: plan });
      }

      // Fetch from DB
      logger.info({ id }, "[DEBUG] Querying DB for plan");
      const results = await db.select().from(dischargePlans).where(eq(dischargePlans.id, id as string));
      
      if (!results || results.length === 0) {
        logger.warn({ id }, "[DEBUG] Plan not found in DB");
        return res.status(404).json({ error: "Plan not found" });
      }

      const planRecord = results[0];
      if (!planRecord) {
         logger.error("[DEBUG] Results[0] is null even if length > 0");
         return res.status(500).json({ error: "Query yielded null row" });
      }

      logger.info({ planId: planRecord.id }, "[DEBUG] Plan record found");
      
      // We return the record directly. The 'data' field is a column in the DB.
      return res.json(planRecord);
    } catch (error: any) {
      logger.error({ 
        msg: error.message, 
        stack: error.stack,
        id 
      }, "[DEBUG] getPlan CRASHED");
      return res.status(500).json({ 
        error: "Failed to fetch plan", 
        detail: error.message || "Unknown error"
      });
    }
  }

  /**
   * POST /api/discharge/import
   * Imports the plan and triggers synchronization
   */
  static async importPlan(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const userId = req.user.id;

      const { planId, mode, data } = req.body || {};

      if (planId === "dev") {
         const result = await DischargeService.normalizePlan(userId, data);
         return res.json({ success: true, message: "Dev plan normalized", data: result });
      }

      const result = await DischargeService.importPlan(userId, planId, mode);
      return res.json(result);
    } catch (error: any) {
      logger.error({ error: error.message }, "[DEBUG] importPlan FAILED");
      return res.status(500).json({ error: "Import failed", detail: error.message });
    }
  }

  /**
   * POST /api/caregiver/create-plan
   */
  static async createPlan(req: AuthRequest, res: Response) {
    try {
      const { patientId, data } = req.body || {};
      
      let actualPatientId = patientId;
      
      // If no patientId is provided, we create a new patient record to attach the plan to
      if (!actualPatientId) {
        if (!data || !data.patientName) {
          return res.status(400).json({ error: "Patient name is required to create a plan." });
        }
        const [newPatient] = await db.insert(patients).values({
          name: data.patientName,
          age: data.age ? parseInt(data.age) : 0,
          condition: data.diagnosis || "Pending",
          dischargeDate: new Date(data.dischargeDate || Date.now()),
          emergencyContact: data.emergencyContact || "Unknown",
          caregiverId: req.user?.id,
        }).returning();
        actualPatientId = newPatient.id;
      }

      const newPlan = await DischargeService.createPlan(actualPatientId, data);
      
      // The frontend expects { planId: string }
      return res.status(201).json({ planId: newPlan.id });
    } catch (error: any) {
      logger.error({ error: error.message }, "[DEBUG] createPlan FAILED");
      return res.status(500).json({ error: "Creation failed", detail: error.message });
    }
  }
}
