import { Router } from "express";
import { Groq, toFile } from "groq-sdk";
import { requireAuth, optionalAuth } from "../middlewares/auth";
import { db, patients, medicines, doseLogs, symptomLogs, eq, inArray, desc } from "@workspace/db";

const router = Router();
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Initialize AI Engines
const groq = new Groq({ apiKey: GROQ_API_KEY || "" });

const SYSTEM_PROMPT = `
You are Mr. Meddy, a highly professional, classy, and intelligent medical recovery companion.
YOUR MISSION: Provide helpful, context-aware, and varied responses. Do NOT repeat yourself.

RULES:
1. ALWAYS use the patient context provided (medicines, symptoms, risk score).
2. If context is empty (Guest), professionally introduce yourself and ask how they are recovering.
3. BE PROFESSIONAL: Do NOT use any emojis. Maintain a polite, classy, and composed tone.
4. BE CONCISE: Keep responses extremely short—no more than 2-3 brief sentences.
5. ACTION ORIENTED: Always suggest 1-2 relevant next steps in the app (e.g. logging a symptom).

STRICT SAFETY:
- No medical diagnoses.
- No changes to medicine dosage.
- If symptoms are severe (risk > 80), tell them to call a doctor IMMEDIATELY.

OUTPUT FORMAT:
- You must respond in a valid JSON format.
- Structure: { "message": "your text here", "actions": [{ "type": "TYPE", "label": "Label" }] }
- Valid Action Types: TAKE_MEDICINE, LOG_SYMPTOM, NAVIGATE_TO_MEDICINES

Example of a GOOD response:
"I am sorry to hear you are experiencing soreness. This is common after your procedure. Would you like me to help you log your pain levels?"

Example of a BAD response (DO NOT USE):
"I'm your recovery assistant! How are you feeling today? 💜"
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
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.7,
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
    console.error("[TTS Final Failure Detail]", {
      message: error.message,
      stack: error.stack,
      voiceId: VOICE_ID
    });
    return res.status(500).json({ 
      error: "Failed to generate voice.",
      details: error.message 
    });
  }
});

/**
 * @route POST /api/ai/stt
 * @desc Transcribe recorded speech to text using Groq's Whisper model.
 *       The mobile/web client records audio, base64-encodes it and posts it here.
 *       Supports multilingual transcription (en/hi/es/ur and more) via Whisper.
 */
// ISO-639-1 codes Whisper accepts. Anything outside this list is treated as
// auto-detect to avoid the model rejecting an unsupported hint.
const WHISPER_LANGS = new Set([
  "en", "hi", "es", "ur", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa",
  "fr", "de", "pt", "ar", "zh", "ja", "ru",
]);

router.post("/stt", optionalAuth, async (req: any, res: any) => {
  const { audioBase64, fileExtension, language } = req.body;

  if (!audioBase64 || typeof audioBase64 !== "string") {
    return res.status(400).json({ error: "audioBase64 is required" });
  }

  if (!GROQ_API_KEY || GROQ_API_KEY.includes("your_")) {
    return res.status(500).json({ error: "Speech recognition is not configured on the server." });
  }

  try {
    // Strip a possible data-URI prefix (e.g. "data:audio/m4a;base64,....").
    const cleaned = audioBase64.includes(",") ? audioBase64.split(",").pop()! : audioBase64;
    const buffer = Buffer.from(cleaned, "base64");

    if (buffer.length < 1000) {
      return res.status(400).json({ error: "Audio recording is too short or empty." });
    }

    const ext = (typeof fileExtension === "string" && fileExtension.replace(/^\./, "")) || "m4a";
    const file = await toFile(buffer, `speech.${ext}`);

    const langHint = typeof language === "string" && WHISPER_LANGS.has(language) ? language : undefined;

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
      ...(langHint ? { language: langHint } : {}),
      temperature: 0,
      response_format: "json",
    });

    const text = (transcription.text || "").trim();
    return res.json({ text });
  } catch (error: any) {
    console.error("[STT Error]", error?.message || error);
    return res.status(500).json({
      error: "Failed to transcribe audio.",
      details: error?.message,
    });
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
        {
          role: "user", content: `
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

/**
 * @route POST /api/ai/test-push
 * @desc Manually trigger a push notification to the logged-in user
 */
import { sendPushNotification } from "../services/notificationService";

router.post("/test-push", requireAuth, async (req: any, res: any) => {
  const user = req.user;
  const { title, body } = req.body;

  if (!user.pushToken) {
    return res.status(400).json({ error: "You haven't registered a push token yet. Call /api/auth/push-token first." });
  }

  try {
    const result = await sendPushNotification(user.pushToken, {
      title: title || "Test Notification 🔔",
      body: body || "This is a test notification from Discharge Buddy!",
    });

    if (result) {
      return res.json({ success: true, message: "Notification sent!", response: result });
    } else {
      return res.status(500).json({ error: "Failed to send notification. Check server logs." });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * @route POST /api/ai/intent
 * @desc Classify a user's natural language command into an actionable app intent
 */
router.post("/intent", optionalAuth, async (req: any, res: any) => {
  const { text, context } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are the command router for "Buddy", the voice assistant inside a medical recovery app called Discharge Buddy.
Map the user's natural-language speech to ONE app action.
Return ONLY valid JSON. No prose, no markdown.
Format: {"intent": "NAVIGATE" | "ACTION" | "CHAT" | "UNKNOWN", "target": "TARGET", "confidence": 0.0_to_1.0}

NAVIGATE targets (just move the user to a screen):
- "medicines"      (go to medicines / show my meds / medicine list)
- "symptoms"       (symptom screen / activity / how am I doing)
- "progress"       (my progress / adherence / streak / stats)
- "schedule"       (my schedule / today's plan / timeline)
- "followups"      (follow ups / appointments / next visit)
- "journal"        (open journal / my diary)
- "scan"           (scan a prescription / open camera / read this bottle)
- "chat"           (talk to Mr Meddy / open chat / ask a question by typing)
- "profile"        (my profile / account)
- "settings"       (settings / preferences)
- "notifications"  (my notifications / alerts)
- "emergency"      (emergency screen / SOS screen)
- "home"           (home / dashboard / main screen)

ACTION targets (do something, not just navigate):
- "TAKE_MEDICINE"     (I took my medicine / I took my pill / mark my dose as taken / log my medicine)
- "LOG_SYMPTOM"       (I have pain / log a symptom / I'm not feeling well / record a symptom)
- "ADD_MEDICINE"      (add a medicine manually / new medicine)
- "TRIGGER_EMERGENCY" (call for help now / this is an emergency / I need help urgently / SOS)
- "LOGOUT"            (log me out / sign out)
- "LANG_EN"           (change language to english / speak english)
- "LANG_HI"           (change language to hindi / hindi me baat karo)
- "LANG_ES"           (change language to spanish / espanol)
- "LANG_UR"           (change language to urdu)

CHAT intent (a question, feeling, or chit-chat that needs a spoken answer, NOT an app action):
- Use {"intent":"CHAT","target":"","confidence":0.9} for things like
  "how are you", "what should I eat", "I feel sad", "what is this medicine for",
  "tell me about my recovery", "good morning".

If nothing fits and it is not conversational, use {"intent":"UNKNOWN","target":"","confidence":0.2}.

Context: the user is currently on screen: ${context || "unknown"}

Examples:
"take me to the scan page"        -> {"intent":"NAVIGATE","target":"scan","confidence":0.95}
"show my progress"                -> {"intent":"NAVIGATE","target":"progress","confidence":0.94}
"I took my morning pill"          -> {"intent":"ACTION","target":"TAKE_MEDICINE","confidence":0.93}
"I have a headache"               -> {"intent":"ACTION","target":"LOG_SYMPTOM","confidence":0.9}
"log me out"                      -> {"intent":"ACTION","target":"LOGOUT","confidence":0.95}
"change language to hindi"        -> {"intent":"ACTION","target":"LANG_HI","confidence":0.95}
"how are you feeling today buddy" -> {"intent":"CHAT","target":"","confidence":0.9}
"asdfghjkl"                       -> {"intent":"UNKNOWN","target":"","confidence":0.2}
`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"intent":"UNKNOWN"}');
    return res.json(result);
  } catch (err: any) {
    console.error("[Intent Parsing Error]", err);
    return res.status(500).json({ intent: "UNKNOWN", error: err.message });
  }
});

export default router;
