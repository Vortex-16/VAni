import { db, medicines, doseLogs, eq, and } from "@workspace/db";
import { logger } from "../lib/logger";

export class MedicineService {
  static async getUserMedicines(patientId: string) {
    return await db.select().from(medicines).where(eq(medicines.patientId, patientId));
  }

  static async getTodayDoses(patientId: string) {
    const today = new Date().toISOString().split("T")[0];
    
    // 1. Ensure doses for today exist for all active medicines
    const userMedicines = await this.getUserMedicines(patientId);
    for (const med of userMedicines) {
      await this.generateDosesForToday(med.id, med.times);
    }

    // 2. Fetch the doses
    return await db.select({
      id: doseLogs.id,
      medicineId: doseLogs.medicineId,
      medicineName: medicines.name,
      scheduledTime: doseLogs.scheduledTime,
      takenAt: doseLogs.takenAt,
      status: doseLogs.status,
      date: doseLogs.date,
      snoozedUntil: doseLogs.snoozedUntil,
    })
    .from(doseLogs)
    .innerJoin(medicines, eq(doseLogs.medicineId, medicines.id))
    .where(and(
      eq(medicines.patientId, patientId),
      eq(doseLogs.date, today)
    ));
  }

  static async updateDoseStatus(id: string, status: "pending" | "taken" | "missed" | "snoozed", snoozeMinutes?: number) {
    let snoozedUntilDate = null;
    if (status === "snoozed" && snoozeMinutes) {
      snoozedUntilDate = new Date(Date.now() + snoozeMinutes * 60000);
    }

    const [updated] = await db.update(doseLogs)
      .set({ 
        status, 
        takenAt: status === "taken" ? new Date() : null,
        snoozedUntil: snoozedUntilDate
      })
      .where(eq(doseLogs.id, id))
      .returning();

    return updated;
  }

  static async generateDosesForToday(medicineId: string, times: string[]) {
    const today = new Date().toISOString().split("T")[0];
    
    // 0. Check if today is beyond the end date
    const [med] = await db.select().from(medicines).where(eq(medicines.id, medicineId));
    if (med?.endDate && new Date(today) > new Date(med.endDate)) {
      logger.info({ medicineId, today }, "Skipping dose generation: medication course ended.");
      return;
    }

    // Check if doses already exist for today to avoid duplicates
    const existing = await db.select().from(doseLogs).where(and(
      eq(doseLogs.medicineId, medicineId),
      eq(doseLogs.date, today)
    ));

    if (existing.length > 0) return;

    const newDoses = times.map(time => ({
      medicineId,
      scheduledTime: time,
      status: "pending" as const,
      date: today,
    }));

    if (newDoses.length > 0) {
      await db.insert(doseLogs).values(newDoses);
    }
  }

  static async addMedicine(patientId: string, medicineData: any) {
    const [newMedicine] = await db.insert(medicines)
      .values({
        patientId,
        name: medicineData.name,
        dosage: medicineData.dosage,
        frequency: medicineData.frequency,
        times: medicineData.times || ["08:00"], 
        instructions: medicineData.instructions || medicineData.notes,
        startDate: (medicineData.startDate && typeof medicineData.startDate === 'string') ? new Date(medicineData.startDate) : new Date(),
        endDate: (medicineData.endDate && typeof medicineData.endDate === 'string') ? new Date(medicineData.endDate) : null,
        color: medicineData.color || "#0891b2",
        totalPills: medicineData.totalPills,
      })
      .returning();

    if (newMedicine) {
      await this.generateDosesForToday(newMedicine.id, newMedicine.times);
    }

    return newMedicine;
  }

  static async updateMedicine(id: string, updates: any) {
    const [updated] = await db.update(medicines)
      .set({
        name: updates.name,
        dosage: updates.dosage,
        frequency: updates.frequency,
        times: updates.times,
        instructions: updates.instructions || updates.notes,
        startDate: (updates.startDate && typeof updates.startDate === 'string') ? new Date(updates.startDate) : undefined,
        endDate: (updates.endDate && typeof updates.endDate === 'string') ? new Date(updates.endDate) : null,
        color: updates.color,
        totalPills: updates.totalPills,
      })
      .where(eq(medicines.id, id))
      .returning();

    if (updated) {
      // Re-generate today's doses if times changed
      // Simple approach: delete pending and re-add
      const today = new Date().toISOString().split("T")[0];
      await db.delete(doseLogs).where(and(
        eq(doseLogs.medicineId, id),
        eq(doseLogs.date, today),
        eq(doseLogs.status, "pending")
      ));
      await this.generateDosesForToday(id, updated.times);
    }

    return updated;
  }

  static async getAdherenceHistory(patientId: string, days: number = 7) {
    const history = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const logs = await db.select().from(doseLogs)
        .innerJoin(medicines, eq(doseLogs.medicineId, medicines.id))
        .where(and(
          eq(medicines.patientId, patientId),
          eq(doseLogs.date, dateStr)
        ));

      const total = logs.length;
      const taken = logs.filter(l => l.dose_logs.status === "taken").length;
      
      history.push({
        date: dateStr,
        taken,
        total,
        percentage: total > 0 ? Math.round((taken / total) * 100) : 0
      });
    }
    return history.reverse();
  }

  static async deleteMedicine(id: string) {
    // Also delete associated dose logs
    await db.delete(doseLogs).where(eq(doseLogs.medicineId, id));
    return await db.delete(medicines).where(eq(medicines.id, id));
  }
}
