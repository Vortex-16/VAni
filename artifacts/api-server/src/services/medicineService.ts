import { db, medicines, doseLogs } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export class MedicineService {
  static async getUserMedicines(patientId: string) {
    return await db.select().from(medicines).where(eq(medicines.patientId, patientId));
  }

  static async getTodayDoses(patientId: string) {
    const today = new Date().toISOString().split("T")[0];
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
}
