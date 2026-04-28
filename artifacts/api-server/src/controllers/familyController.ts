import { Request, Response } from "express";
import { db, patients, users, eq } from "@workspace/db";
import type { AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

export class FamilyController {
  /**
   * GET /api/family/members
   * Returns all patients linked to the family user
   */
  static async getMembers(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const members = await db.select()
        .from(patients)
        .where(eq(patients.caregiverId, req.user.id));

      return res.json({ members });
    } catch (error: any) {
      logger.error({ error: error.message }, "[FamilyController] getMembers failed");
      return res.status(500).json({ error: "Failed to fetch family members", detail: error.message });
    }
  }

  /**
   * POST /api/family/members
   * Manually adds a new family member (patient)
   */
  static async addMember(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const { name, age, condition, emergencyContact } = req.body;

      if (!name) return res.status(400).json({ error: "Name is required" });

      const [newPatient] = await db.insert(patients).values({
        name,
        age: age ? parseInt(age) : 0,
        condition: condition || "Healthy",
        dischargeDate: new Date(),
        emergencyContact: emergencyContact || req.user.phone || "Unknown",
        caregiverId: req.user.id,
      }).returning();

      return res.status(201).json({ member: newPatient });
    } catch (error: any) {
      logger.error({ error: error.message }, "[FamilyController] addMember failed");
      return res.status(500).json({ error: "Failed to add family member", detail: error.message });
    }
  }

  /**
   * POST /api/family/members/link
   * Links an existing patient account via email (Option 2)
   */
  static async linkMember(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      // Find the patient user by email
      const [patientUser] = await db.select().from(users).where(eq(users.email, email));
      if (!patientUser || patientUser.role !== "patient") {
        return res.status(404).json({ error: "Patient account not found with this email" });
      }

      if (!patientUser.linkedPatientId) {
         return res.status(400).json({ error: "This patient account is not fully set up." });
      }

      // Link the caregiver ID of the patient record to this family user
      const [updatedPatient] = await db.update(patients)
        .set({ caregiverId: req.user.id })
        .where(eq(patients.id, patientUser.linkedPatientId))
        .returning();

      return res.json({ success: true, member: updatedPatient });
    } catch (error: any) {
      logger.error({ error: error.message }, "[FamilyController] linkMember failed");
      return res.status(500).json({ error: "Failed to link family member", detail: error.message });
    }
  }
}
