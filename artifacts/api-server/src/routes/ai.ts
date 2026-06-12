import { Router } from "express";
import { Groq, toFile } from "groq-sdk";
import { EdgeTTS } from "@andresaya/edge-tts";
import { requireAuth, optionalAuth } from "../middlewares/auth";
import { db, patients, medicines, doseLogs, symptomLogs, eq, inArray, desc } from "@workspace/db";

const router = Router();
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Initialize AI Engines
const groq = new Groq({ apiKey: GROQ_API_KEY || "" });

const SYSTEM_PROMPT = `
You are Mr. Meddy, a highly professional, compassionate, and intelligent post-discharge medical recovery companion.
YOUR MISSION: Provide genuinely helpful, specific, context-aware advice. Do NOT repeat yourself.

RULES:
1. ALWAYS use the patient context provided (medicines, symptoms, risk score).
2. If context is empty (Guest), professionally introduce yourself and ask how they are recovering.
3. BE PROFESSIONAL: Do NOT use any emojis. Maintain a polite, classy, and composed tone.
4. BE CONCISE: Keep responses short — 2-4 sentences. Prioritize clarity over length.
5. GIVE REAL ADVICE: When a patient asks about a health issue (e.g. "I have fever", "feeling unwell"), provide professional guidance specific to their situation — do NOT just redirect them to a help screen. Suggest practical next steps (rest, hydration, monitoring temperature, when to call a doctor). Reference their medicines and context where relevant.
6. ACTION ORIENTED: Suggest 1-2 relevant next steps in the app (e.g. logging a symptom, checking medicines).
7. SEVERITY: Always use the word "severity" instead of "rating".
8. CONVERSATION MEMORY: If the user refers to an ongoing symptom, reference recent logs naturally.
9. MEDICATION DOSE NOTIFICATIONS: Do NOT mention pending doses unless the user explicitly asks about medication.
10. NAVIGATION: Only suggest navigating to a screen when it is the BEST action (e.g. "open medicines" to update a schedule). For general health questions, answer them directly — DO NOT navigate.
11. HIGH SEVERITY: If risk score > 80 or symptoms are critical, advise the patient to call their doctor immediately or go to the nearest hospital. Mention that their family/caregiver will be notified through the app.

STRICT SAFETY:
- No medical diagnoses.
- No changes to medicine dosage.
- Always recommend consulting a healthcare professional for serious symptoms.

OUTPUT FORMAT:
- Respond in valid JSON format.
- Structure: { "message": "your text here", "actions": [{ "type": "TYPE", "label": "Label" }] }
- Valid Action Types: TAKE_MEDICINE, LOG_SYMPTOM, NAVIGATE_TO_MEDICINES
- For general health questions, actions array can be empty or contain only LOG_SYMPTOM.

Example of a GOOD response for "I have fever":
"A mild fever can be common after a procedure or during recovery. Rest, stay hydrated, and monitor your temperature. If it exceeds 39°C (102°F) or persists beyond 24 hours, please contact your doctor immediately. Would you like me to log this symptom?"

Example of a BAD response (DO NOT USE):
"Please visit the help screen." (Never navigate for a health question)
"You have pending medicines." (If not relevant)
"I'm your recovery assistant! How are you feeling today? 💜" (Too informal, emojis)
`;


// ── Edge TTS (Microsoft Edge online neural voices) ──────────────────────────
// Same engine as the innoai "Edge-TTS-Text-to-Speech" HF Space, accessed via
// the @andresaya/edge-tts package. No API key required. Each app language maps
// to a high-quality Indian-locale neural voice so SOS/medical replies are
// spoken naturally in the patient's own language.
//
// Voice short-names come from Microsoft Edge's catalog (edge_tts list-voices).
// Override the default per language with EDGE_TTS_VOICE_<LANG> env vars if
// needed (e.g. EDGE_TTS_VOICE_HI=hi-IN-MadhurNeural for a male Hindi voice).
const EDGE_VOICE_BY_LANG: Record<string, string> = {
  en: "en-IN-NeerjaNeural",   // Indian English (female)
  hi: "hi-IN-SwaraNeural",    // Hindi
  bn: "bn-IN-TanishaaNeural", // Bengali
  ta: "ta-IN-PallaviNeural",  // Tamil
  te: "te-IN-ShrutiNeural",   // Telugu
  mr: "mr-IN-AarohiNeural",   // Marathi
  gu: "gu-IN-DhwaniNeural",   // Gujarati
  kn: "kn-IN-SapnaNeural",    // Kannada
  ml: "ml-IN-SobhanaNeural",  // Malayalam
  ur: "ur-IN-GulNeural",      // Urdu (India)
  es: "es-ES-ElviraNeural",   // Spanish (fallback locale)
  // Microsoft Edge has no native neural voice for these locales yet, so we map
  // each to its closest available Indic voice (better pronunciation than the
  // English default). Override via EDGE_TTS_VOICE_<LANG> if a voice ships later.
  pa: "hi-IN-SwaraNeural",    // Punjabi → Hindi (no pa-IN voice)
  or: "bn-IN-TanishaaNeural", // Odia → Bengali (no or-IN voice)
  as: "bn-IN-TanishaaNeural", // Assamese → Bengali (no as-IN voice)
};
const DEFAULT_EDGE_VOICE = "en-IN-NeerjaNeural";

function resolveEdgeVoice(language?: string): string {
  const lang = (language || "en").toLowerCase().split(/[-_]/)[0];
  const override = process.env[`EDGE_TTS_VOICE_${lang.toUpperCase()}`];
  return override || EDGE_VOICE_BY_LANG[lang] || DEFAULT_EDGE_VOICE;
}

/**
 * @route POST /api/ai/tts
 * @desc Generate neural speech via Microsoft Edge TTS (multilingual, incl. all
 *       major Indian languages). Accepts an optional `language` (app lang code,
 *       e.g. "hi") and/or explicit `voice` (Edge short-name). 1-retry logic.
 * @body { text: string, language?: string, voice?: string, rate?: number, pitch?: number }
 * @returns { audioContent: base64 mp3, format: "mp3", voiceId }
 */
const ttsCache = new Map<string, string>();

router.post("/tts", async (req: any, res: any) => {
  const { text, language, voice, rate, pitch } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  // Filter out emojis and tech symbols so they aren't read aloud.
  const cleanText = String(text)
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2300}-\u{23FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) {
    return res.status(400).json({ error: "Text is empty after sanitisation" });
  }

  const voiceId = (typeof voice === "string" && voice.trim()) || resolveEdgeVoice(language);

  // Edge TTS expects rate as "+N%"/"-N%" and pitch as "+NHz"/"-NHz".
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const rateStr = `${clamp(Math.round(Number(rate) || 0), -50, 50) >= 0 ? "+" : ""}${clamp(Math.round(Number(rate) || 0), -50, 50)}%`;
  const pitchStr = `${clamp(Math.round(Number(pitch) || 0), -20, 20) >= 0 ? "+" : ""}${clamp(Math.round(Number(pitch) || 0), -20, 20)}Hz`;

  const cacheKey = `${voiceId}_${rateStr}_${pitchStr}_${cleanText}`;
  if (ttsCache.has(cacheKey)) {
    console.log(`[TTS Server Cache] Hit for voiceId: ${voiceId}`);
    return res.json({
      audioContent: ttsCache.get(cacheKey),
      format: "mp3",
      voiceId,
    });
  }

  const generateAudio = async (attempt: number = 0): Promise<string> => {
    try {
      const tts = new EdgeTTS();
      await tts.synthesize(cleanText, voiceId, {
        rate: rateStr,
        pitch: pitchStr,
        volume: "+0%",
        outputFormat: "audio-24khz-48kbitrate-mono-mp3",
      });
      const base64 = tts.toBase64();
      if (!base64) throw new Error("Edge TTS returned empty audio");
      return base64;
    } catch (error) {
      if (attempt < 1) { // 1 retry max
        console.warn(`[EdgeTTS] TTS attempt ${attempt + 1} failed, retrying...`);
        return generateAudio(attempt + 1);
      }
      throw error;
    }
  };

  try {
    const audioBase64 = await generateAudio();
    
    // Evict oldest if cache size exceeds limit
    if (ttsCache.size > 1000) {
      const firstKey = ttsCache.keys().next().value;
      if (firstKey !== undefined) {
        ttsCache.delete(firstKey);
      }
    }
    ttsCache.set(cacheKey, audioBase64);

    return res.json({
      audioContent: audioBase64,
      format: "mp3",
      voiceId,
    });
  } catch (error: any) {
    console.error("[TTS Final Failure Detail]", {
      message: error.message,
      stack: error.stack,
      voiceId,
    });
    return res.status(500).json({
      error: "Failed to generate voice.",
      details: error.message,
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
// Map the app's language codes to the human name we instruct the LLM to reply in.
const CHAT_LANG_NAMES: Record<string, string> = {
  en: "English", hi: "Hindi", es: "Spanish", ur: "Urdu", bn: "Bengali",
  te: "Telugu", mr: "Marathi", ta: "Tamil", gu: "Gujarati", kn: "Kannada",
  ml: "Malayalam", or: "Odia", pa: "Punjabi", as: "Assamese",
};

// Normalise the client-supplied conversation history into safe chat messages.
// Caps length and per-message size so a malformed/huge client payload can't blow
// up the prompt. Returns oldest→newest, ready to splice before the live query.
function buildHistoryMessages(history: any): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(history)) return [];
  const MAX_TURNS = 8;
  const MAX_CHARS = 600;
  return history
    .filter((t) => t && (t.role === "user" || t.role === "assistant") && typeof t.text === "string" && t.text.trim())
    .slice(-MAX_TURNS)
    .map((t) => ({ role: t.role as "user" | "assistant", content: String(t.text).slice(0, MAX_CHARS) }));
}

router.post("/chat", optionalAuth, async (req: any, res: any) => {
  const { userQuery, language, history, screenContext } = req.body;
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

    // Resolve the reply language. Default to English; honour any supported code.
    const langName = (typeof language === "string" && CHAT_LANG_NAMES[language]) || "English";
    const langDirective = `\nLANGUAGE: The "message" field MUST be written entirely in ${langName}. Use the native script for ${langName}. Do NOT translate or alter the action "type" values (keep them in English). If the user wrote in another language, still reply in ${langName}.`;

    // Prior conversation turns (Phase 5 memory), oldest→newest, before the live query.
    const historyMessages = buildHistoryMessages(history);
    console.log(`[AI Chat] Including ${historyMessages.length} history turns.`);

    // Screen context (Phase 7) — lets the model resolve deictic queries like
    // "what is this?" against whatever the user is currently looking at.
    const screenLine = typeof screenContext === "string" && screenContext.trim()
      ? `\n          CURRENT_SCREEN: The user is currently viewing ${screenContext.trim().slice(0, 300)} Use this to resolve vague references like "this", "that", or "it".`
      : "";

    // 3. Prompt Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT + langDirective },
        ...historyMessages,
        {
          role: "user", content: `
          CURRENT_TIME: ${new Date().toISOString()}${screenLine}
          USER_QUERY: "${userQuery}"

          PATIENT_CONTEXT:
          ${JSON.stringify(context, null, 2)}

          Based on the context and query, provide a UNIQUE, specific, and calm response.
          Avoid generic greetings. If the user asks a question, answer it directly using the context.
          Reply in ${langName}. Always include 2-3 relevant actions in the actions array.
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
 * @route POST /api/ai/drug-check
 * @desc Check a set of medicines for drug-drug interactions using Groq.
 *       Accepts an explicit { medicines: string[] } list, otherwise falls back
 *       to the authenticated patient's active medicines.
 */
const DRUG_CHECK_SYSTEM_PROMPT = `
You are a clinical pharmacology assistant that screens a patient's medication list for drug-drug interactions.

RULES:
1. Only report interactions between drugs that are ACTUALLY present in the provided list. Never invent a medicine that is not listed.
2. Match by active ingredient. "Tylenol" = acetaminophen/paracetamol, "Advil" = ibuprofen, etc.
3. severity must be one of: "mild", "moderate", "high".
   - "high" = potentially dangerous, needs prompt medical attention / avoid combination.
   - "moderate" = clinically significant, monitor closely.
   - "mild" = minor, usually manageable.
4. Be factual and concise. Use plain language a patient can understand. No emojis.
5. NEVER give a diagnosis or tell the patient to start/stop/change a dose. Advice = "monitor for X", "space doses", "ask your doctor or pharmacist".
6. If there are no known interactions, return an empty "interactions" array and an encouraging summary.

OUTPUT FORMAT — respond with ONLY valid JSON, no markdown:
{
  "interactions": [
    { "pair": ["DrugA", "DrugB"], "severity": "mild|moderate|high", "description": "what happens, in plain language", "advice": "what the patient should do" }
  ],
  "foodWarnings": ["e.g. avoid grapefruit with X"],
  "summary": "one or two sentence overall read",
  "hasCritical": false
}
Set "hasCritical" to true if any interaction is "high".
`;

router.post("/drug-check", optionalAuth, async (req: any, res: any) => {
  try {
    const user = req.user;
    let medList: string[] = Array.isArray(req.body?.medicines)
      ? req.body.medicines.filter((m: any) => typeof m === "string" && m.trim()).map((m: string) => m.trim())
      : [];

    // Fall back to the linked patient's active medicines when none supplied.
    if (medList.length === 0 && user?.linkedPatientId) {
      const meds = await db
        .select()
        .from(medicines)
        .where(eq(medicines.patientId, user.linkedPatientId));
      medList = meds.map((m) => `${m.name}${m.dosage ? ` ${m.dosage}` : ""}`);
    }

    // De-dupe and cap to keep the prompt bounded.
    medList = Array.from(new Set(medList)).slice(0, 30);

    if (medList.length < 2) {
      return res.json({
        interactions: [],
        foodWarnings: [],
        summary: "Add at least two medicines to check for interactions.",
        hasCritical: false,
        medicinesChecked: medList,
      });
    }

    if (!GROQ_API_KEY || GROQ_API_KEY.includes("your_")) {
      return res.status(500).json({ error: "Drug interaction checking is not configured on the server." });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: DRUG_CHECK_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Patient's current medicines:\n${medList.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n\nScreen this list for interactions and respond in the required JSON format.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { interactions: [], foodWarnings: [], summary: "Unable to analyse interactions right now.", hasCritical: false };
    }

    const interactions = Array.isArray(parsed.interactions) ? parsed.interactions : [];
    return res.json({
      interactions,
      foodWarnings: Array.isArray(parsed.foodWarnings) ? parsed.foodWarnings : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      hasCritical: interactions.some((i: any) => i?.severity === "high"),
      medicinesChecked: medList,
    });
  } catch (error: any) {
    console.error("[Drug Check Error]", error?.message || error);
    return res.status(500).json({ error: "Failed to check drug interactions.", details: error?.message });
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
      body: body || "This is a test notification from VAni!",
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
// Voice Emergency Mode — deterministic server-side guard. The small intent
// model is unreliable on safety-critical phrasing, so distress words and
// critical danger signs short-circuit straight to TRIGGER_EMERGENCY (also
// saves a round-trip to the LLM).
const EMERGENCY_INTENT_PHRASES = [
  "help me", "help help", "emergency", "sos", "save me", "i need help", "call for help",
  "call ambulance", "call an ambulance", "i'm dying", "im dying",
  "chest pain", "chest pressure", "can't breathe", "cant breathe", "cannot breathe",
  "difficulty breathing", "trouble breathing", "short of breath",
  "heart attack", "stroke", "slurred speech", "face drooping", "severe bleeding",
  "i collapsed", "i'm choking", "im choking", "unconscious",
  "bachao", "madad", "मदद", "बचाओ", "सीने में दर्द", "साँस नहीं", "दिल का दौरा",
  "ayuda", "emergencia", "dolor de pecho", "no puedo respirar",
  "مدد", "بچاؤ", "বাঁচাও", "সাহায্য", "বুকে ব্যথা",
];

function isEmergencyIntent(text: string): boolean {
  const t = String(text).toLowerCase().trim();
  if (!t) return false;
  if (t === "help" || t === "emergency" || t === "sos") return true;
  return EMERGENCY_INTENT_PHRASES.some((p) => t.includes(p));
}

router.post("/intent", optionalAuth, async (req: any, res: any) => {
  const { text, context } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });

  if (isEmergencyIntent(text)) {
    return res.json({ intent: "ACTION", target: "TRIGGER_EMERGENCY", metadata: {}, confidence: 0.99 });
  }

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are the command router for "Buddy", the voice assistant inside a medical recovery app called VAni.
Map the user's natural-language speech to ONE app action.
Return ONLY valid JSON. No prose, no markdown.
Format: {"intent": "NAVIGATE" | "ACTION" | "CHAT" | "UNKNOWN", "target": "TARGET", "metadata": {"symptom": "extracted symptom if applicable", "severity": "extracted severity 1-10 if applicable, null if none", "timerMinutes": "number of minutes if applicable, null if none", "isMeditation": boolean}, "confidence": 0.0_to_1.0}

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
- "family"         (family dashboard / family view / my family members / caregiver dashboard)
- "meditation"     (open meditation timer / calm session without setting a specific time)

ACTION targets (do something, not just navigate):
- "TAKE_MEDICINE"     (I took my medicine / I took my pill / mark my dose as taken / log my medicine)
- "LOG_SYMPTOM"       (I have pain / log a symptom / I'm feeling dizzy / headache today / record nausea). *IMPORTANT*: Implicit symptom statements like "I'm feeling dizzy" MUST map to LOG_SYMPTOM. Try to infer severity (1-10): mild/very mild=3, moderate=5, strong=7, severe=8, unbearable=10. EXCEPTION: critical danger signs (see TRIGGER_EMERGENCY) must map to TRIGGER_EMERGENCY, NOT LOG_SYMPTOM.
- "ADD_MEDICINE"      (add a medicine manually / new medicine)
- "TRIGGER_EMERGENCY" (Voice Emergency Mode — highest priority. Map here for: bare distress words like "help", "emergency", "SOS", "save me", "call an ambulance"; explicit urgency like "this is an emergency / I need help urgently"; AND critical danger signs spoken as a complaint: "chest pain", "chest pressure", "I can't breathe / difficulty breathing", "heart attack", "stroke", "slurred speech", "face drooping", "severe bleeding", "I'm choking", "I collapsed". When in doubt between a life-threatening symptom and logging it, choose TRIGGER_EMERGENCY.)
- "LOGOUT"            (log me out / sign out)
- "LANG_EN"           (change language to english / speak english)
- "LANG_HI"           (change language to hindi / hindi me baat karo)
- "LANG_ES"           (change language to spanish / espanol)
- "LANG_UR"           (change language to urdu)
- "LANG_BN"           (change language to bengali / speak bengali / bangla / বাংলায় বলো)
- "SEND_NOTE_TO_FAMILY" (tell my daughter / send a message to family / let my son know / tell my caregiver / inform family / notify my family that)
- "SET_TIMER"         (remind me in X minutes / set medicine timer / meditate for 20 minutes). Extract timerMinutes. Set isMeditation to true if it's for meditation.

CHAT intent (a question, feeling, or chit-chat that needs a spoken answer, NOT an app action):
- Use {"intent":"CHAT","target":"","metadata":{},"confidence":0.9} for things like
  "how are you", "what should I eat", "I feel sad", "what is this medicine for",
  "tell me about my recovery", "good morning", "what should I do now", "what do I do", "what are my next steps".
- IMPORTANT: Questions asking for guidance, advice, or next steps (such as "what should I do now", "what do I do", "what is the next step") MUST map to CHAT intent, NOT NAVIGATE. Only classify as NAVIGATE if the user explicitly names a screen to open (e.g. "go to settings", "open medicines").

If nothing fits and it is not conversational, use {"intent":"UNKNOWN","target":"","metadata":{},"confidence":0.2}.

Context: the user is currently on screen: ${context || "unknown"}

Examples:
"I want to meditate for 20 minutes" -> {"intent":"ACTION","target":"SET_TIMER","metadata":{"timerMinutes":20,"isMeditation":true},"confidence":0.95}
"Remind me in 30 minutes"         -> {"intent":"ACTION","target":"SET_TIMER","metadata":{"timerMinutes":30,"isMeditation":false},"confidence":0.95}
"take me to the scan page"        -> {"intent":"NAVIGATE","target":"scan","metadata":{},"confidence":0.95}
"show my progress"                -> {"intent":"NAVIGATE","target":"progress","metadata":{},"confidence":0.94}
"I took my morning pill"          -> {"intent":"ACTION","target":"TAKE_MEDICINE","metadata":{},"confidence":0.93}
"I'm feeling mildly dizzy"        -> {"intent":"ACTION","target":"LOG_SYMPTOM","metadata":{"symptom":"dizziness","severity":3},"confidence":0.95}
"Severe headache today"           -> {"intent":"ACTION","target":"LOG_SYMPTOM","metadata":{"symptom":"headache","severity":8},"confidence":0.95}
"Help"                            -> {"intent":"ACTION","target":"TRIGGER_EMERGENCY","metadata":{},"confidence":0.97}
"Emergency"                       -> {"intent":"ACTION","target":"TRIGGER_EMERGENCY","metadata":{},"confidence":0.97}
"I have chest pain"               -> {"intent":"ACTION","target":"TRIGGER_EMERGENCY","metadata":{},"confidence":0.95}
"I can't breathe"                 -> {"intent":"ACTION","target":"TRIGGER_EMERGENCY","metadata":{},"confidence":0.97}
"I have a stomach ache"           -> {"intent":"ACTION","target":"LOG_SYMPTOM","metadata":{"symptom":"stomach ache","severity":null},"confidence":0.9}
"log me out"                      -> {"intent":"ACTION","target":"LOGOUT","metadata":{},"confidence":0.95}
"what should I do now"             -> {"intent":"CHAT","target":"","metadata":{},"confidence":0.95}
"what do I do"                     -> {"intent":"CHAT","target":"","metadata":{},"confidence":0.95}
"how are you feeling today buddy" -> {"intent":"CHAT","target":"","metadata":{},"confidence":0.9}
"asdfghjkl"                       -> {"intent":"UNKNOWN","target":"","metadata":{},"confidence":0.2}`

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
