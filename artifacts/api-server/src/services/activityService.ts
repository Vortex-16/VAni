import { db, symptomLogs, journalEntries } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export class ActivityService {
  static async getSymptoms(patientId: string) {
    return await db.select()
      .from(symptomLogs)
      .where(eq(symptomLogs.patientId, patientId))
      .orderBy(desc(symptomLogs.date));
  }

  static async addSymptom(patientId: string, data: { symptoms: string[], severity: number, notes?: string, riskLevel?: "low" | "medium" | "high" }) {
    const [created] = await db.insert(symptomLogs).values({
      patientId,
      symptoms: data.symptoms || [],
      severity: data.severity || 1,
      notes: data.notes || "",
      riskLevel: data.riskLevel || "low"
    }).returning();
    return created;
  }

  static async getJournals(userId: string) {
    return await db.select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, userId))
      .orderBy(desc(journalEntries.date));
  }

  static async addJournal(userId: string, data: { mood: number, energy: number, text: string }) {
    const [created] = await db.insert(journalEntries).values({
      userId,
      mood: data.mood || 5,
      energy: data.energy || 5,
      text: data.text || ""
    }).returning();
    return created;
  }
}
