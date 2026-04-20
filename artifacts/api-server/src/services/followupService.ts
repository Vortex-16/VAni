import { db, followups } from "@workspace/db";
import { eq, and, asc, sql } from "drizzle-orm";

/**
 * Follow-up management service.
 * Provides CRUD for user-level follow-up appointments with reminder logic.
 */
export class FollowupService {
  static async createFollowup(
    userId: string,
    data: {
      type: string;
      title: string;
      scheduledDate: Date;
      reminderDaysBefore?: number;
      notes?: string;
    }
  ) {
    const [followup] = await db.insert(followups).values({
      userId,
      type: data.type,
      title: data.title,
      scheduledDate: data.scheduledDate,
      reminderDaysBefore: data.reminderDaysBefore ?? 1,
      notes: data.notes,
    }).returning();

    return followup;
  }

  static async getFollowups(
    userId: string,
    statusFilter?: "upcoming" | "completed" | "missed"
  ) {
    const conditions = [eq(followups.userId, userId)];
    if (statusFilter) {
      conditions.push(eq(followups.status, statusFilter));
    }

    return await db.select()
      .from(followups)
      .where(and(...conditions))
      .orderBy(asc(followups.scheduledDate));
  }

  static async updateFollowupStatus(
    followupId: string,
    userId: string,
    status: "completed" | "missed"
  ) {
    const [updated] = await db.update(followups)
      .set({ status })
      .where(and(eq(followups.id, followupId), eq(followups.userId, userId)))
      .returning();

    if (!updated) {
      throw new Error("Followup not found or unauthorized");
    }

    return updated;
  }

  static async deleteFollowup(followupId: string, userId: string) {
    const [deleted] = await db.delete(followups)
      .where(and(eq(followups.id, followupId), eq(followups.userId, userId)))
      .returning();

    if (!deleted) {
      throw new Error("Followup not found or unauthorized");
    }

    return true;
  }

  /**
   * Find all upcoming follow-ups where the reminder window has opened.
   * i.e. scheduledDate > NOW() AND scheduledDate - reminderDaysBefore <= NOW()
   */
  static async getDueReminders() {
    return await db.select()
      .from(followups)
      .where(
        and(
          eq(followups.status, "upcoming"),
          sql`${followups.scheduledDate} > NOW()`,
          sql`${followups.scheduledDate} - (${followups.reminderDaysBefore} * interval '1 day') <= NOW()`
        )
      );
  }
}
