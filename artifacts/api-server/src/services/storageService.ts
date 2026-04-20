import { db, users, prescriptions } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

/**
 * Data storage service.
 * Manages prescription storage and user profile data.
 */
export class StorageService {
  /**
   * Save a prescription record with optional image URL, raw text, and extracted data.
   */
  static async savePrescription(
    userId: string,
    data: {
      imageUrl?: string;
      rawText?: string;
      extractedData?: unknown;
    }
  ) {
    const [prescription] = await db.insert(prescriptions).values({
      userId,
      imageUrl: data.imageUrl,
      rawText: data.rawText,
      extractedData: data.extractedData,
    }).returning();

    return prescription;
  }

  /**
   * Get all prescriptions for a user, ordered by most recent first.
   */
  static async getUserPrescriptions(userId: string) {
    return await db.select()
      .from(prescriptions)
      .where(eq(prescriptions.userId, userId))
      .orderBy(desc(prescriptions.createdAt));
  }

  /**
   * Get user profile data.
   */
  static async getUserProfile(userId: string) {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }
}
