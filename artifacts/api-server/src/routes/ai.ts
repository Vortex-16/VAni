import { Router } from "express";
import fetch from "node-fetch";
import { Groq } from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireAuth } from "../middlewares/auth";
import { db, patients, medicines, doseLogs, symptomLogs, eq, inArray, desc } from "@workspace/db";

const router = Router();
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Initialize AI Engines
const groq = new Groq({ apiKey: GROQ_API_KEY || "" });
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY || "");

// Keep Gemini for high-fidelity TTS (Aoede)
const ttsModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest", 
});

const SYSTEM_PROMPT = `
You are a calm, supportive recovery assistant inside a medical app.
You are NOT a doctor. You do NOT diagnose or prescribe medicines.

Your role:
- Help patients understand how they are feeling
- Use their provided medical context (symptoms, medicines, history)
- Give simple, safe, and calming guidance
- Suggest next steps within the app

# ⚠️ STRICT SAFETY RULES:
- DO NOT suggest new medicines or change dosage.
- DO NOT diagnose diseases.
- DO NOT use alarming words like "emergency" or "dangerous" unless clearly critical (e.g. risk score > 90).
- If symptoms persist, suggest contacting their caregiver.

# 📦 OUTPUT FORMAT (STRICT JSON):
{
  "message": "Your full response here (formatted with line breaks and emojis)",
  "actions": [
    { "type": "LOG_SYMPTOM", "label": "Log Symptom" },
    { "type": "CONTACT_CAREGIVER", "label": "Notify Caregiver" },
    { "type": "START_MEDITATION", "label": "Start Calm Session" }
  ]
}
Return ONLY valid JSON.
`;

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "wPnE1V9WfO5tQ3w6D0Xh"; 

/**
 * @route POST /api/ai/tts
 * @desc Generate high-quality speech using ElevenLabs with 1-retry logic
 */
router.post("/tts", async (req: any, res: any) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY.includes("your_")) {
    return res.status(500).json({ error: "ElevenLabs API Key is not configured" });
  }

  // Filter out emojis and tech symbols
  const cleanText = text
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2300}-\u{23FF}]/gu, '')
    .trim();

  const generateAudio = async (attempt: number = 0): Promise<Buffer> => {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`ElevenLabs Error [${response.status}]: ${JSON.stringify(errorData)}`);
      }

      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      if (attempt < 1) { // 1 retry max
        console.warn(`[ElevenLabs] TTS attempt ${attempt + 1} failed, retrying...`);
        return generateAudio(attempt + 1);
      }
      throw error;
    }
  };

  try {
    const audioBuffer = await generateAudio();
    const audioBase64 = audioBuffer.toString('base64');

    return res.json({ 
      audioContent: audioBase64,
      format: "mp3",
      voiceId: VOICE_ID
    });
  } catch (error: any) {
    console.error("[TTS Final Failure]", error.message);
    return res.status(500).json({ error: "Failed to generate voice. Please check API quota/connection." });
  }
});

/**
 * @route POST /api/ai/chat
 * @desc Context-aware recovery assistant chatbot
 */
router.post("/chat", requireAuth, async (req: any, res: any) => {
  const { userQuery } = req.body;
  const userId = req.user.id;

  if (!userQuery) {
    return res.status(400).json({ error: "Query is required" });
  }

  try {
    // 1. Gather User Context
    const patientId = req.user.linkedPatientId;

    if (!patientId) {
      return res.status(404).json({ error: "No patient profile linked to this account" });
    }

    const userPatient = await db.query.patients.findFirst({
      where: eq(patients.id, patientId),
    });

    if (!userPatient) {
      return res.status(404).json({ error: "Patient record not found" });
    }

    const [userMeds, userSymptoms] = await Promise.all([
      db.select().from(medicines).where(eq(medicines.patientId, userPatient.id)),
      db.select().from(symptomLogs)
        .where(eq(symptomLogs.patientId, userPatient.id))
        .orderBy(desc(symptomLogs.date))
        .limit(5),
    ]);

    const medIds = userMeds.map(m => m.id);
    const userDoseLogs = medIds.length > 0
      ? await db.select().from(doseLogs).where(inArray(doseLogs.medicineId, medIds)).orderBy(desc(doseLogs.date)).limit(10)
      : [];

    // 2. Compute risk score (not stored in DB — calculated from live data)
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const missedDoses = userDoseLogs.filter(d => {
      if (d.status !== "pending") return false;
      if (d.date === todayStr) {
        const [h] = d.scheduledTime.split(":").map(Number);
        return (now.getHours() - h) >= 4;
      }
      return d.date < todayStr;
    });

    const last24hSymptoms = userSymptoms.filter(s =>
      (now.getTime() - new Date(s.date).getTime()) < 24 * 60 * 60 * 1000
    );

    let computedRiskScore = 10;
    computedRiskScore += missedDoses.length * 15;
    if (last24hSymptoms.some(s => s.severity >= 8 || s.riskLevel === "high")) computedRiskScore += 30;
    if (last24hSymptoms.some(s => s.symptoms.includes("Fever") && s.severity >= 7)) computedRiskScore += 40;
    computedRiskScore = Math.min(computedRiskScore, 100);

    // 3. Build Context Object
    const context = {
      userName: req.user.name,
      medicines: userMeds.map(m => ({ name: m.name, dosage: m.dosage, instructions: m.instructions })),
      recentSymptoms: userSymptoms.map(s => ({ symptoms: s.symptoms, severity: s.severity, date: s.date })),
      recentDoses: userDoseLogs.map(d => {
        const med = userMeds.find(m => m.id === d.medicineId);
        return { medicine: med?.name || "Unknown", status: d.status, time: d.scheduledTime, date: d.date };
      }),
      riskScore: computedRiskScore,
    };

    // 3. Prompt Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `
          USER QUERY: "${userQuery}"
          
          PATIENT CONTEXT:
          ${JSON.stringify(context, null, 2)}
          
          Based on this context and the user query, provide a calm, safe response as per your system rules.
        ` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || "{}";
    const result = JSON.parse(responseText);

    return res.json(result);
  } catch (error: any) {
    console.error("[Chat Error]", error);
    return res.status(500).json({ 
      message: "I'm sorry, I'm having trouble connecting right now. Please rest and try again in a moment. 💜",
      actions: [{ type: "RETRY", label: "Try Again" }]
    });
  }
});

export default router;
