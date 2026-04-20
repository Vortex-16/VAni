import { db, recoveryLogs } from "@workspace/db";
import { eq, and, asc, desc, sql } from "drizzle-orm";

/**
 * Recovery tracking service.
 * Manages daily recovery logs, calculates trends, and detects health alerts.
 */
export class RecoveryService {
  /**
   * Insert or update a daily recovery log.
   * Uses PostgreSQL ON CONFLICT (userId, logDate) to upsert.
   */
  static async upsertRecoveryLog(
    userId: string,
    data: {
      logDate: string;
      painLevel?: number;
      energyLevel?: number;
      fever?: boolean;
      feverTemp?: number;
      notes?: string;
    }
  ) {
    const [log] = await db.insert(recoveryLogs)
      .values({
        userId,
        logDate: data.logDate,
        painLevel: data.painLevel,
        energyLevel: data.energyLevel,
        fever: data.fever ?? false,
        feverTemp: data.feverTemp ? data.feverTemp.toString() : undefined,
        notes: data.notes,
      })
      .onConflictDoUpdate({
        target: [recoveryLogs.userId, recoveryLogs.logDate],
        set: {
          painLevel: data.painLevel,
          energyLevel: data.energyLevel,
          fever: data.fever ?? false,
          feverTemp: data.feverTemp ? data.feverTemp.toString() : undefined,
          notes: data.notes,
        },
      })
      .returning();

    return log;
  }

  /**
   * Get recovery logs for the last N days, ordered ascending by date.
   */
  static async getRecoveryLogs(userId: string, days: number = 30) {
    return await db.select()
      .from(recoveryLogs)
      .where(
        and(
          eq(recoveryLogs.userId, userId),
          sql`${recoveryLogs.logDate} >= CURRENT_DATE - (${days} * interval '1 day')`
        )
      )
      .orderBy(asc(recoveryLogs.logDate));
  }

  /**
   * Analyze recovery trends over the last 14 days.
   * Compares first-half vs second-half pain levels to determine direction.
   */
  static async getRecoveryTrends(userId: string) {
    const logs = await this.getRecoveryLogs(userId, 14);

    if (logs.length === 0) {
      return { avgPain: 0, avgEnergy: 0, feverDays: 0, trend: "stable" as const, logs: [] };
    }

    let totalPain = 0, painCount = 0;
    let totalEnergy = 0, energyCount = 0;
    let feverDays = 0;

    for (const log of logs) {
      if (log.painLevel !== null) {
        totalPain += log.painLevel;
        painCount++;
      }
      if (log.energyLevel !== null) {
        totalEnergy += log.energyLevel;
        energyCount++;
      }
      if (log.fever) {
        feverDays++;
      }
    }

    const avgPain = painCount > 0 ? totalPain / painCount : 0;
    const avgEnergy = energyCount > 0 ? totalEnergy / energyCount : 0;

    // Trend: compare first half vs second half average pain
    let trend: "improving" | "stable" | "worsening" = "stable";
    if (logs.length >= 4) {
      const mid = Math.floor(logs.length / 2);
      const firstHalf = logs.slice(0, mid);
      const secondHalf = logs.slice(mid);

      let p1 = 0, c1 = 0, p2 = 0, c2 = 0;
      firstHalf.forEach(l => { if (l.painLevel !== null) { p1 += l.painLevel; c1++; } });
      secondHalf.forEach(l => { if (l.painLevel !== null) { p2 += l.painLevel; c2++; } });

      const a1 = c1 > 0 ? p1 / c1 : 0;
      const a2 = c2 > 0 ? p2 / c2 : 0;

      if (a2 < a1 - 1) trend = "improving";
      else if (a2 > a1 + 1) trend = "worsening";
    }

    return { avgPain, avgEnergy, feverDays, trend, logs };
  }

  /**
   * Detect health alerts based on recent recovery logs.
   * Flags: consecutive high pain, persistent fever, critically low energy.
   */
  static async detectAlerts(userId: string) {
    const logs = await this.getRecoveryLogs(userId, 3);
    const alerts: string[] = [];

    if (logs.length >= 2) {
      const latest = logs.slice(-2);
      if (latest.every(l => l.painLevel !== null && l.painLevel >= 8)) {
        alerts.push("High pain levels detected for consecutive days.");
      }
    }

    if (logs.length >= 3) {
      const latest = logs.slice(-3);
      if (latest.every(l => l.fever)) {
        alerts.push("Persistent fever detected for 3 or more days.");
      }
      if (latest.every(l => l.energyLevel !== null && l.energyLevel <= 2)) {
        alerts.push("Extremely low energy detected for 3 or more days.");
      }
    }

    return { alerts };
  }
}
