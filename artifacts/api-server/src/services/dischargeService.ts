import { db, medicines, doseLogs, dischargePlans, users, patients, eq, and, desc } from "@workspace/db";
import { logger } from "../lib/logger";
import { MedicineService } from "./medicineService";

export interface DischargeMedication {
  name: string;
  dosage: string;
  frequency: string; // e.g., "TID", "Twice Daily", "OD"
  duration: number; // days
  instructions?: string;
}

export interface DischargePlanData {
  patientName: string;
  hospitalName?: string;
  medicines: DischargeMedication[];
  instructions?: string;
  followUpDate?: string;
}

export class DischargeService {
  /**
   * Translates clinical frequency into specific anchor types
   */
  private static mapFrequencyToAnchors(frequency: string): string[] {
    const f = frequency.toLowerCase();

    // Daily / OD
    if (f.includes("od") || f.includes("once") || f.includes("daily")) {
      return ["morning"];
    }

    // BID / Twice Daily
    if (f.includes("bid") || f.includes("twice") || f.includes("bd")) {
      return ["morning", "evening"];
    }

    // TID / Thrice Daily
    if (f.includes("tid") || f.includes("thrice") || f.includes("three")) {
      return ["morning", "afternoon", "evening"];
    }

    // QID / Four times
    if (f.includes("qid") || f.includes("four")) {
      return ["morning", "afternoon", "evening", "night"];
    }

    // Default fallback
    return ["morning"];
  }

  /**
   * Normalizes a raw plan into internal medication formats using user's anchor times
   */
  static async normalizePlan(userId: string, rawData: DischargePlanData) {
    if (!rawData) throw new Error("No plan data provided for normalization");

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const anchors: any = user?.anchorTimes || {
      morning: "08:00",
      afternoon: "14:00",
      evening: "20:00",
      night: "22:00"
    };

    const actualData = (rawData as any).data || rawData;
    logger.info({ userId, inputMeds: actualData.medicines?.length || 0 }, "Normalizing discharge plan.");

    const normalizedMeds = (actualData.medicines || []).map((m: any) => {
      const anchorKeys = this.mapFrequencyToAnchors(m.frequency);
      const times = anchorKeys.map(key => anchors[key] || "08:00");

      // DEBUB LOGGING: Normalization Trace
      logger.info({
        inputFrequency: m.frequency,
        mappedAnchors: anchorKeys,
        resultTimes: times,
        medication: m.name
      }, "[NORMALIZATION DEBUG]");

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + (m.duration || 7));

      return {
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        times,
        instructions: m.instructions,
        startDate,
        endDate,
        color: "#6C47FF" // Brand color default
      };
    });

    return {
      ...rawData,
      normalizedMeds
    };
  }

  /**
   * Imports a plan, handling versioning and archiving
   */
  static async importPlan(userId: string, planId: string, mode: "merge" | "replace") {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    const [plan] = await db.select().from(dischargePlans).where(eq(dischargePlans.id, planId));
    if (!plan) throw new Error("Plan not found");

    // SECURITY CHECKS
    if (plan.isUsed) throw new Error("This discharge plan has already been imported.");
    if (plan.expiresAt && new Date() > new Date(plan.expiresAt)) {
      throw new Error("This discharge plan has expired. Please contact your hospital.");
    }

    const patientId = plan.patientId; // This is the ID of the `patients` row
    const planData = plan.data as unknown as DischargePlanData;

    // Link the user's account to this patient record if not already linked
    if (user.linkedPatientId !== patientId) {
      await db.update(users)
        .set({ linkedPatientId: patientId })
        .where(eq(users.id, userId));
    }

    // 1. Versioning: Handle "Replace" mode by archiving existing meds
    if (mode === "replace") {
      logger.info({ patientId }, "Archiving existing medications for replacement.");
      await db.update(medicines)
        .set({ status: "archived" })
        .where(and(
          eq(medicines.patientId, patientId),
          eq(medicines.status, "active")
        ));

      // Deactivate other plans
      await db.update(dischargePlans)
        .set({ isActive: false })
        .where(eq(dischargePlans.patientId, patientId));
    }

    // 2. Normalize and Create Medicines
    const { normalizedMeds } = await this.normalizePlan(userId, planData);

    const createdMeds = [];
    for (const med of normalizedMeds) {
      const created = await MedicineService.addMedicine(patientId, {
        ...med,
        planId: plan.id
      });
      createdMeds.push(created);
    }

    // 3. Update Plan Status
    await db.update(dischargePlans)
      .set({ isUsed: true, isActive: true })
      .where(eq(dischargePlans.id, plan.id));

    // 4. Notify Caregivers
    const { NotificationService } = require("./notificationService");
    await NotificationService.sendPlanImportedNotification(patientId, plan.id).catch((e: any) => {
      logger.error({ err: e }, "Failed to notify caregiver about plan import");
    });

    logger.info({ userId, planId, createdCount: createdMeds.length }, "Discharge plan imported successfully.");

    return {
      success: true,
      medicinesImported: createdMeds.length
    };
  }

  /**
   * Stores a new plan (Hospital-side utility)
   */
  static async createPlan(patientId: string, data: DischargePlanData) {
    // Get current version for this patient
    const existing = await db.select()
      .from(dischargePlans)
      .where(eq(dischargePlans.patientId, patientId))
      .orderBy(desc(dischargePlans.version))
      .limit(1);

    const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;

    const [newPlan] = await db.insert(dischargePlans)
      .values({
        patientId,
        hospitalName: data.hospitalName || "General Hospital",
        data: data as any,
        version: nextVersion,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h expiry
      })
      .returning();

    return newPlan;
  }
}
