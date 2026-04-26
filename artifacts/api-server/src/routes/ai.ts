import { Router } from "express";
import fetch from "node-fetch";
import { Groq } from "groq-sdk";
import { requireAuth, optionalAuth } from "../middlewares/auth";
import { db, patients, medicines, doseLogs, symptomLogs, eq, inArray, desc } from "@workspace/db";

const router = Router();
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Initialize AI Engines
const groq = new Groq({ apiKey: GROQ_API_KEY || "" });

const SYSTEM_PROMPT = `
You are Mr. Meddy, a warm, supportive, and intelligent medical recovery companion.
YOUR MISSION: Provide helpful, context-aware, and varied responses. Do NOT repeat yourself.

RULES:
1. ALWAYS use the patient context provided (medicines, symptoms, risk score).
2. If context is empty (Guest), introduce yourself and ask how they are feeling after their surgery or procedure.
3. BE HUMAN: Use emojis 💜, vary your sentence structure, and show empathy.
4. BE CONCISE: Keep responses to 2-3 short paragraphs.
5. ACTION ORIENTED: Always suggest 1-2 relevant next steps in the app (e.g. log a symptom if they mention pain).

STRICT SAFETY:
- No medical diagnoses.
- No changes to medicine dosage.
- If symptoms are severe (risk > 80), tell them to call a doctor IMMEDIATELY.

OUTPUT FORMAT:
- You must respond in a valid JSON format.
- Structure: { "message": "your text here", "actions": [{ "type": "TYPE", "label": "Label" }] }

Example of a GOOD response:
"I'm sorry you're feeling a bit sore today. That's common after your procedure. Have you taken your Metformin? I can help you log your pain levels if you'd like. 💜"

Example of a BAD response (DO NOT USE):
"I'm your recovery assistant. How are you feeling today?"
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
router.post("/chat", optionalAuth, async (req: any, res: any) => {
  const { userQuery } = req.body;
  const user = req.user; 
  console.log(`[AI Chat] Request received. User: ${user?.name || "Guest"}, Query: ${userQuery}`);

  if (!userQuery) {
    return res.status(400).json({ error: "Query is required" });
  }

  try {
    const start = Date.now();
    // 1. Gather User Context
    const patientId = user?.linkedPatientId;
    let userPatient = null;
    let userMeds: any[] = [];
    let userSymptoms: any[] = [];
    let userDoseLogs: any[] = [];
    let computedRiskScore = 10;

    if (patientId) {
      userPatient = await db.query.patients.findFirst({
        where: eq(patients.id, patientId),
      });

      if (userPatient) {
        const [meds, symptoms] = await Promise.all([
          db.select().from(medicines).where(eq(medicines.patientId, userPatient.id)),
          db.select().from(symptomLogs)
            .where(eq(symptomLogs.patientId, userPatient.id))
            .orderBy(desc(symptomLogs.date))
            .limit(5),
        ]);
        
        userMeds = meds;
        userSymptoms = symptoms;

        const medIds = userMeds.map(m => m.id);
        userDoseLogs = medIds.length > 0
          ? await db.select().from(doseLogs).where(inArray(doseLogs.medicineId, medIds)).orderBy(desc(doseLogs.date)).limit(10)
          : [];

        // 2. Compute risk score
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

        computedRiskScore += missedDoses.length * 15;
        if (last24hSymptoms.some(s => s.severity >= 8 || s.riskLevel === "high")) computedRiskScore += 30;
        if (last24hSymptoms.some(s => s.symptoms.includes("Fever") && s.severity >= 7)) computedRiskScore += 40;
        computedRiskScore = Math.min(computedRiskScore, 100);
      }
    }

    // 3. Build Context Object
    const context = {
      userName: user?.name || "Guest",
      medicines: userMeds.map(m => ({ name: m.name, dosage: m.dosage, instructions: m.instructions })),
      recentSymptoms: userSymptoms.map(s => ({ symptoms: s.symptoms, severity: s.severity, date: s.date })),
      recentDoses: userDoseLogs.map(d => {
        const med = userMeds.find(m => m.id === d.medicineId);
        return { medicine: med?.name || "Unknown", status: d.status, time: d.scheduledTime, date: d.date };
      }),
      riskScore: computedRiskScore,
    };

    console.log(`[AI Chat] Context built in ${Date.now() - start}ms. Risk Score: ${computedRiskScore}`);

    // 3. Prompt Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `
          CURRENT_TIME: ${new Date().toISOString()}
          USER_QUERY: "${userQuery}"
          
          PATIENT_CONTEXT:
          ${JSON.stringify(context, null, 2)}
          
          Based on the context and query, provide a UNIQUE, specific, and calm response. 
          Avoid generic greetings. If the user asks a question, answer it directly using the context.
          Always include 2-3 relevant actions in the actions array.
        ` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    console.log(`[AI Chat] Groq responded in ${Date.now() - start}ms`);

    const responseText = chatCompletion.choices[0]?.message?.content || "{}";
    console.log("[AI Chat] Raw Groq Content:", responseText);
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
