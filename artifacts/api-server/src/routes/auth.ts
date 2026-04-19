import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { db, users, patients, medicines, doseLogs } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { AuthRequest } from "../middlewares/auth";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/oauth", async (req, res) => {
  try {
    const { provider, idToken } = req.body;
    
    if (provider !== "google") {
      return res.status(400).json({ error: "Unsupported provider" });
    }

    let email = "";
    let name = "";

    // If we are using a placeholder client ID, we simulate successful verification
    // using the token payload directly (assuming it's a mock token from frontend)
    if (process.env.GOOGLE_CLIENT_ID === "PLACEHOLDER_GOOGLE_CLIENT_ID" || process.env.NODE_ENV === "test") {
      // Decode mock JWT without verifying signature
      const decodedPayload = jwt.decode(idToken) as any;
      if (decodedPayload && decodedPayload.email) {
        email = decodedPayload.email;
        name = decodedPayload.name || "Test User";
      } else {
        // Fallback for completely dummy tokens
        email = "test@example.com";
        name = "Test User";
      }
    } else {
      // Real Google verification
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.status(400).json({ error: "Invalid Google token payload" });
      }
      email = payload.email;
      name = payload.name || "User";
    }

    // Upsert User
    let [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
      // Create a dummy patient profile for new users since this app requires it
      const [newPatient] = await db.insert(patients).values({
        name,
        age: 30, // Mock
        condition: "General Checkup",
        dischargeDate: new Date(),
        emergencyContact: "911",
      }).returning();

      [user] = await db.insert(users).values({
        email,
        name,
        role: "patient",
        linkedPatientId: newPatient.id,
      }).returning();
    }

    // Generate our JWT Session Token
    const token = jwt.sign(
      { sub: user.id }, 
      process.env.JWT_SECRET || "super_secret_dev_jwt_key", 
      { expiresIn: "7d" }
    );

    res.json({ token, user });
  } catch (error) {
    logger.error({ err: error }, "OAuth Error");
    res.status(500).json({ error: "Authentication failed" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { email, name, role } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: "Email and name are required" });
    }

    let [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    
    if (user) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Create a patient profile linked to this user
    const [newPatient] = await db.insert(patients).values({
      name,
      age: 0, 
      condition: "New Patient",
      dischargeDate: new Date(),
      emergencyContact: "None",
    }).returning();

    [user] = await db.insert(users).values({
      email: email.toLowerCase(),
      name,
      role: role || "patient",
      linkedPatientId: newPatient.id,
    }).returning();

    const token = jwt.sign(
      { sub: user.id }, 
      process.env.JWT_SECRET || "super_secret_dev_jwt_key", 
      { expiresIn: "7d" }
    );

    res.json({ token, user });
  } catch (error) {
    logger.error({ err: error }, "Register Error");
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    
    if (!user) {
      return res.status(404).json({ error: "User not found. Please register first." });
    }

    const token = jwt.sign(
      { sub: user.id }, 
      process.env.JWT_SECRET || "super_secret_dev_jwt_key", 
      { expiresIn: "7d" }
    );

    res.json({ token, user });
  } catch (error) {
    logger.error({ err: error }, "Login Error");
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/dev-session", async (req, res) => {
  try {
    // ONLY ALLOW IN DEV OR FOR SPECIFIC FLAG
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Not allowed in production" });
    }

    const email = "tester@dev.com";
    const name = "Dev Tester";

    // 1. Upsert User
    let [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
      const [newPatient] = await db.insert(patients).values({
        name,
        age: 45,
        condition: "Testing Conditions",
        dischargeDate: new Date(),
        emergencyContact: "911-DEV",
      }).returning();

      [user] = await db.insert(users).values({
        email,
        name,
        role: "patient",
        linkedPatientId: newPatient.id,
      }).returning();
    }

    // 2. Seed Medicines if empty
    const existingMeds = await db.select().from(medicines).where(eq(medicines.patientId, user.linkedPatientId!));
    
    if (existingMeds.length === 0) {
      const insertedMeds = await db.insert(medicines).values([
        {
          name: "Lisinopril",
          dosage: "10mg",
          frequency: "Once daily",
          times: ["08:00"],
          instructions: "Take with food",
          patientId: user.linkedPatientId!,
          startDate: new Date(),
          color: "#0891b2",
        },
        {
          name: "Metformin",
          dosage: "500mg",
          frequency: "Twice daily",
          times: ["08:00", "20:00"],
          instructions: "Do not crush",
          patientId: user.linkedPatientId!,
          startDate: new Date(),
          color: "#f59e0b",
        }
      ]).returning();

      // 3. Seed Dose Logs for Today
      const today = new Date().toISOString().split("T")[0];
      const doseEntries = [];

      for (const med of insertedMeds) {
        for (const time of med.times) {
          doseEntries.push({
            medicineId: med.id,
            scheduledTime: time,
            date: today,
            status: "pending" as const,
          });
        }
      }

      if (doseEntries.length > 0) {
        await db.insert(doseLogs).values(doseEntries);
      }
    }

    // 3. Generate token
    const token = jwt.sign(
      { sub: user.id }, 
      process.env.JWT_SECRET || "super_secret_dev_jwt_key", 
      { expiresIn: "7d" }
    );

    res.json({ token, user });
  } catch (error) {
    logger.error({ err: error }, "Dev Session Error");
    res.status(500).json({ error: "Dev session failed" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

router.post("/push-token", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    await db.update(users)
      .set({ pushToken: token })
      .where(eq(users.id, req.user!.id));

    logger.info({ userId: req.user!.id, token }, "Push token registered");
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Push Token Registration Error");
    res.status(500).json({ error: "Failed to register push token" });
  }
});

export default router;
