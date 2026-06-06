import admin from 'firebase-admin';
import { logger } from '../lib/logger';
import { db, users, patients, medicines, doseLogs, eq } from "@workspace/db";

/**
 * NotificationService
 * 
 * Handles sending push notifications via Google Firebase Cloud Messaging (FCM).
 * This service allows the app to receive notifications even when it's closed (killed).
 */

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // Private key needs to handle escaped newlines and sometimes leftover quotes from dotenv parsers
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
};

export class NotificationService {
  static init() {
    if (firebaseConfig.projectId && firebaseConfig.clientEmail && firebaseConfig.privateKey) {
      try {
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(firebaseConfig as admin.ServiceAccount),
          });
          logger.info("Firebase Admin SDK initialized successfully");
        }
      } catch (error) {
        logger.error({ err: error }, "Failed to initialize Firebase Admin SDK");
      }
    } else {
      logger.warn("Firebase credentials missing. Push notifications will be disabled.");
    }
  }

  static async sendPlanImportedNotification(patientId: string, planId: string) {
    try {
      // 1. Get the patient to find the caregiver
      const [patient] = await db.select().from(patients).where(eq(patients.id, patientId));
      if (!patient || !patient.caregiverId) return;

      // 2. Get the caregiver user to find the push token
      const [caregiver] = await db.select().from(users).where(eq(users.id, patient.caregiverId));
      if (!caregiver || !caregiver.pushToken) {
         logger.info({ patientId }, "No push token for caregiver, skipping notification.");
         return;
      }

      await sendPushNotification(caregiver.pushToken, {
        title: "Discharge Plan Imported!",
        body: `${patient.name} has successfully scanned and imported their discharge plan.`,
        data: {
          type: "PLAN_IMPORTED",
          patientId,
          planId
        }
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to send plan imported notification");
    }
  }

  static async sendDoseTakenNotification(doseLogId: string) {
    try {
      const [result] = await db.select({
        patientName: patients.name,
        medicineName: medicines.name,
        caregiverPushToken: users.pushToken,
      })
      .from(doseLogs)
      .innerJoin(medicines, eq(doseLogs.medicineId, medicines.id))
      .innerJoin(patients, eq(medicines.patientId, patients.id))
      .innerJoin(users, eq(patients.caregiverId, users.id))
      .where(eq(doseLogs.id, doseLogId));

      if (!result || !result.caregiverPushToken) return;

      await sendPushNotification(result.caregiverPushToken, {
        title: "Medication Taken ✅",
        body: `${result.patientName} has taken their dose of ${result.medicineName}.`,
        data: {
          type: "DOSE_TAKEN",
          doseLogId
        }
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to send dose taken notification");
    }
  }

  static async sendInactivityAlert(patientId: string, hours: number) {
    try {
      const [patient] = await db.select().from(patients).where(eq(patients.id, patientId));
      if (!patient || !patient.caregiverId) return;

      const [caregiver] = await db.select().from(users).where(eq(users.id, patient.caregiverId));
      if (!caregiver || !caregiver.pushToken) return;

      await sendPushNotification(caregiver.pushToken, {
        title: "⚠️ Inactivity Detected",
        body: `${patient.name} has not logged any medication or health activity for ${hours} hours. Please check in on them.`,
        data: {
          type: "INACTIVITY_ALERT",
          patientId,
          riskLevel: "high"
        }
      });
      
      logger.info({ patientId }, "Sent inactivity alert to caregiver");
    } catch (error) {
      logger.error({ err: error }, "Failed to send inactivity alert");
    }
  }
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotification(token: string, payload: NotificationPayload) {
  if (!token) return null;

  // Route Expo push tokens to Expo Push API
  if (token.startsWith("ExponentPushToken[") || token.includes("host.exp.expo")) {
    logger.info({ token }, "Sending push notification via Expo API");
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: token,
          sound: "default",
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
        }),
      });
      const data = await response.json();
      logger.info({ data }, "Expo push notification response");
      return data;
    } catch (error) {
      logger.error({ err: error, token }, "Error sending Expo push notification");
      return null;
    }
  }

  // Route native tokens to Firebase Cloud Messaging (FCM)
  if (!admin.apps.length) {
    logger.error("Firebase Admin not initialized. Cannot send FCM notification.");
    return null;
  }

  try {
    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      token: token,
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          clickAction: 'OPEN_APP',
        },
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: 'default',
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    logger.info({ response, token }, "FCM push notification sent successfully");
    return response;
  } catch (error) {
    logger.error({ err: error, token }, "Error sending FCM push notification");
    return null;
  }
}

/**
 * Batch send notifications to multiple tokens
 */
export async function sendMulticastNotification(tokens: string[], payload: NotificationPayload) {
  if (tokens.length === 0) return null;

  const expoTokens: string[] = [];
  const fcmTokens: string[] = [];

  for (const token of tokens) {
    if (token.startsWith("ExponentPushToken[") || token.includes("host.exp.expo")) {
      expoTokens.push(token);
    } else {
      fcmTokens.push(token);
    }
  }

  // Batch send to Expo
  if (expoTokens.length > 0) {
    try {
      const messages = expoTokens.map(token => ({
        to: token,
        sound: "default",
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
      }));

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });
      const data = await response.json();
      logger.info({ data }, "Expo multicast push response");
    } catch (error) {
      logger.error({ err: error, expoTokens }, "Error sending Expo multicast push");
    }
  }

  // Batch send to FCM
  if (fcmTokens.length > 0) {
    if (!admin.apps.length) {
      logger.warn("Firebase Admin not initialized. Skipping FCM multicast.");
      return null;
    }

    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: fcmTokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
      });
      logger.info({ successCount: response.successCount, failureCount: response.failureCount }, "FCM multicast notifications sent");
      return response;
    } catch (error) {
      logger.error({ err: error }, "Error sending FCM multicast notifications");
      return null;
    }
  }

  return null;
}
