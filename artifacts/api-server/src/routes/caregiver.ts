import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { db, patients, medicines, doseLogs, symptomLogs, followUps, eq, inArray } from "@workspace/db";
import { DischargeService } from "../services/dischargeService";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * GET /api/caregiver/patients
 * Returns the list of patients associated with the logged-in caregiver,
 * including nested data required for the Risk Engine.
 */
router.get("/patients", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const isStaff = req.user.role === "caregiver";
    
    // 1. Fetch patients (Staff see all, Family see only linked)
    let linkedPatients;
    if (isStaff) {
      linkedPatients = await db.select().from(patients);
    } else {
      linkedPatients = await db.select().from(patients).where(eq(patients.caregiverId, userId));
    }
    
    if (linkedPatients.length === 0) {
      return res.json({ patients: [] });
    }

    const patientIds = linkedPatients.map(p => p.id);

    // 2. Fetch all nested relations in parallel
    const [allMedicines, allSymptomLogs, allFollowUps] = await Promise.all([
      db.select().from(medicines).where(inArray(medicines.patientId, patientIds)),
      db.select().from(symptomLogs).where(inArray(symptomLogs.patientId, patientIds)),
      db.select().from(followUps).where(inArray(followUps.patientId, patientIds)),
    ]);

    const allMedicineIds = allMedicines.map(m => m.id);
    const allDoseLogs = allMedicineIds.length > 0 
      ? await db.select().from(doseLogs).where(inArray(doseLogs.medicineId, allMedicineIds))
      : [];

    // Format output and check for "Silent" patients
    const now = new Date();
    const currentHour = now.getHours();
    const todayStr = now.toISOString().split("T")[0];

    const formattedPatients = linkedPatients.map(p => {
      const pMeds = allMedicines.filter(m => m.patientId === p.id);
      const medIds = pMeds.map(m => m.id);
      const pDoseLogs = allDoseLogs.filter(d => medIds.includes(d.medicineId));
      const pSymptomLogs = allSymptomLogs.filter(s => s.patientId === p.id);
      
      // Silent Patient Detection Logic
      const silenceThreshold = isStaff ? 48 : 6;
      
      const pendingAndOverdue = pDoseLogs.filter(d => {
        if (d.status !== "pending") return false;
        if (d.date === todayStr) {
          const [h] = d.scheduledTime.split(":").map(Number);
          return (currentHour - h) >= 4;
        }
        return d.date < todayStr;
      });

      const sortedSymptoms = pSymptomLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastSymptomLog = sortedSymptoms[0];
      
      const lastSymptomHours = lastSymptomLog 
        ? (now.getTime() - new Date(lastSymptomLog.date).getTime()) / (1000 * 60 * 60)
        : 999;

      const isSilent = pendingAndOverdue.length > 0 && lastSymptomHours > silenceThreshold;

      // --- AI RISK SCORING ENGINE ---
      let riskScore = 10; // Base score
      
      // 1. Penalize missed doses
      riskScore += pendingAndOverdue.length * 15;
      
      // 2. Symptom severity
      const last24hSymptoms = pSymptomLogs.filter(s => 
        (now.getTime() - new Date(s.date).getTime()) < (24 * 60 * 60 * 1000)
      );
      
      const hasSeverePain = last24hSymptoms.some(s => s.severity >= 8 || s.riskLevel === "high");
      const hasFever = last24hSymptoms.some(s => s.symptoms.includes("Fever") && s.severity >= 7);
      
      if (hasSeverePain) riskScore += 30;
      if (hasFever) riskScore += 40;
      
      // 3. Inactivity penalty
      if (lastSymptomHours > 48) riskScore += 25;
      
      riskScore = Math.min(100, riskScore);
      const riskLevel = riskScore > 70 ? "High" : riskScore > 35 ? "Moderate" : "Low";

      // Trigger Alert if silent
      if (isSilent) {
        const { NotificationService } = require("../services/notificationService");
        NotificationService.sendInactivityAlert(p.id, silenceThreshold).catch(() => {});
      }
      
      return {
        ...p,
        dischargeDate: p.dischargeDate?.toISOString(),
        medicines: pMeds.map(m => ({ ...m, startDate: m.startDate?.toISOString(), endDate: m.endDate?.toISOString() })),
        doseLogs: pDoseLogs.map(d => ({ ...d, takenAt: d.takenAt?.toISOString() })),
        symptomLogs: pSymptomLogs.map(s => ({ ...s, date: s.date?.toISOString() })),
        followUps: allFollowUps.filter(f => f.patientId === p.id).map(f => ({ ...f, dateTime: f.dateTime?.toISOString() })),
        isSilent: isSilent,
        isEscalated: pendingAndOverdue.length > 0 && lastSymptomHours > 48,
        riskScore,
        riskLevel
      };
    });

    return res.json({ patients: formattedPatients });
  } catch (error: any) {
    console.error("[Caregiver Route] Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/caregiver/briefing/:patientId
 * Uses Gemini to generate a concise summary of the last 48 hours.
 */
router.get("/briefing/:patientId", requireAuth, async (req: any, res) => {
  try {
    const { patientId } = req.params;
    
    // Fetch logs from last 48h
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    const [pMeds, pSymptoms] = await Promise.all([
      db.select().from(medicines).where(eq(medicines.patientId, patientId)),
      db.select().from(symptomLogs).where(eq(symptomLogs.patientId, patientId)),
    ]);
    
    const medIds = pMeds.map(m => m.id);
    const pDoses = medIds.length > 0
      ? await db.select().from(doseLogs).where(inArray(doseLogs.medicineId, medIds))
      : [];
    
    const recentDoses = pDoses.filter(d => new Date(d.date) >= cutoff || d.status === "pending");
    const recentSymptoms = pSymptoms.filter(s => new Date(s.date) >= cutoff);
    
    const prompt = `
      You are a clinical assistant. Summarize the last 48 hours for this patient based on these logs.
      Medicines: ${pMeds.map(m => m.name).join(", ")}
      Missed/Pending Doses: ${recentDoses.filter(d => d.status !== "taken").length}
      Taken Doses: ${recentDoses.filter(d => d.status === "taken").length}
      Symptoms Logged: ${recentSymptoms.map(s => `${s.symptoms.join(", ")} (Severity: ${s.severity}/10)`).join("; ")}
      
      Generate a concise, 2-sentence clinical summary for a busy nurse. Focus on risks.
    `;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    return res.json({ summary });
  } catch (error: any) {
    console.error("[Briefing Error]:", error);
    return res.status(500).json({ error: "Failed to generate briefing" });
  }
});

/**
 * POST /api/caregiver/create-plan
 * Issues a new discharge plan, creating a patient linked to this caregiver.
 */
router.post("/create-plan", requireAuth, async (req: any, res) => {
  try {
    const caregiverId = req.user.id;
    const data = req.body.data || req.body;

    const [newPatient] = await db.insert(patients).values({
      caregiverId,
      name: data.patientName || "Unknown Patient",
      age: isNaN(parseInt(data.age)) ? 0 : parseInt(data.age),
      condition: data.diagnosis || data.condition || "Unknown Condition",
      dischargeDate: data.dischargeDate && !isNaN(Date.parse(data.dischargeDate)) ? new Date(data.dischargeDate) : new Date(),
      emergencyContact: data.emergencyContact || "No contact provided",
    }).returning();

    const newPlan = await DischargeService.createPlan(newPatient.id, data);
    return res.json({ planId: newPlan.id });
  } catch (error: any) {
    console.error("[Caregiver Route] Error creating plan:", error);
    return res.status(500).json({ error: "Failed to create plan", detail: error.message });
  }
});

export default router;
