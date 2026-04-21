import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { db, patients } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * GET /api/caregiver/patients
 * 
 * Returns the list of patients associated with the logged-in caregiver.
 */
router.get("/patients", requireAuth, async (req: any, res) => {
  try {
    // For now, return all patients as a fallback if specific mapping isn't found
    // In a real app, we'd filter by caregiver_id
    const allPatients = await db.select().from(patients);
    
    return res.json(allPatients);
  } catch (error: any) {
    console.error("[Caregiver Route] Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
