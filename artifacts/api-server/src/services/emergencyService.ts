import { db, emergencyAlerts } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export class EmergencyService {
  static async logEmergency(userId: string) {
    const [alert] = await db.insert(emergencyAlerts).values({
      userId,
      status: "active"
    }).returning();
    
    // In a real production system, this is where we would trigger Twilio/FCM SMS or push notifications to caregivers.
    return alert;
  }

  static async getEmergencies(userId: string) {
    return await db.select()
      .from(emergencyAlerts)
      .where(eq(emergencyAlerts.userId, userId))
      .orderBy(desc(emergencyAlerts.timestamp));
  }
}
