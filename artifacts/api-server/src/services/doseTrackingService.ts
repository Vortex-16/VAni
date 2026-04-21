import { db, doseLogs, medicines } from "@workspace/db";
import { eq, and, lt } from "drizzle-orm";

/**
 * Enhanced dose tracking service.
 * Works alongside existing MedicineService — provides adherence analytics
 * and automatic missed-dose marking on top of the existing doseLogs table.
 */
export class DoseTrackingService {
  /**
   * Calculate adherence statistics for a patient's dose logs.
   * Returns counts for each status and overall adherence percentage.
   */
  static async getAdherenceStats(patientId: string) {
    const patientMeds = await db.select()
      .from(medicines)
      .where(eq(medicines.patientId, patientId));

    if (patientMeds.length === 0) {
      return { total: 0, taken: 0, missed: 0, pending: 0, snoozed: 0, adherencePercent: 0 };
    }

    const medIds = patientMeds.map(m => m.id);

    // Fetch all dose logs for this patient's medicines
    const allLogs = [];
    for (const medId of medIds) {
      const logs = await db.select()
        .from(doseLogs)
        .where(eq(doseLogs.medicineId, medId));
      allLogs.push(...logs);
    }

    const total = allLogs.length;
    let taken = 0;
    let missed = 0;
    let pending = 0;
    let snoozed = 0;

    for (const log of allLogs) {
      switch (log.status) {
        case "taken": taken++; break;
        case "missed": missed++; break;
        case "pending": pending++; break;
        case "snoozed": snoozed++; break;
      }
    }

    const adherencePercent = total > 0 ? Math.round((taken / total) * 100) : 0;

    return { total, taken, missed, pending, snoozed, adherencePercent };
  }

  /**
   * Auto-mark any pending doses that are older than 2 hours as "missed".
   * Returns the number of doses marked.
   */
  static async markMissedDoses(patientId: string) {
    const patientMeds = await db.select()
      .from(medicines)
      .where(eq(medicines.patientId, patientId));

    if (patientMeds.length === 0) return 0;

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    let markedCount = 0;

    for (const med of patientMeds) {
      // Get pending dose logs for today
      const pendingLogs = await db.select()
        .from(doseLogs)
        .where(
          and(
            eq(doseLogs.medicineId, med.id),
            eq(doseLogs.date, today),
            eq(doseLogs.status, "pending")
          )
        );

      for (const log of pendingLogs) {
        // Parse scheduled time (HH:mm format)
        const [schedHour, schedMin] = log.scheduledTime.split(":").map(Number);
        const scheduledMinutes = schedHour * 60 + schedMin;
        const currentTotalMinutes = currentHours * 60 + currentMinutes;

        // If more than 120 minutes past scheduled time, mark as missed
        if (currentTotalMinutes - scheduledMinutes > 120) {
          await db.update(doseLogs)
            .set({ status: "missed" })
            .where(eq(doseLogs.id, log.id));
          markedCount++;
        }
      }
    }

    return markedCount;
  }
}
