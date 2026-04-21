/**
 * Prescription Service — Orchestrator for the OCR → AI → Parser pipeline.
 *
 * Pipeline:
 *   1. Send image to Python OCR service (docTR + TrOCR)
 *   2. If OCR service unavailable → fall back to Groq Vision (Llama 3.2) for raw OCR
 *   3. Send extracted text to Groq for medical structuring + explanation (Llama 3.3)
 *   4. Enrich with rule-based medical parser (schedule, timing)
 *   5. Return structured result with per-medicine confidence scores
 *
 * Groq is NEVER used for raw OCR when the Python service is available.
 *   2. If OCR service unavailable → fall back to Gemini Vision for raw OCR
 *   3. Send extracted text to Gemini for medical structuring + explanation
 *   4. Enrich with rule-based medical parser (schedule, timing)
 *   5. Return structured result with per-medicine confidence scores
 *
 * Gemini is NEVER used for raw OCR when the Python service is available.
 */

import { analyzeWithOCR, type OCRAnalysisResult, type QualityReport } from "./ocrClient";
import { enrichWithRuleParsing, type ParsedMedicine, type ParsedSchedule } from "./medicalParser";
import { GoogleGenerativeAI } from "@google/generative-ai";


// ─── Output Interfaces ───

export interface ExtractedMedicine {
  name: string;
  dosage: string;
  frequency: string;
  frequency_code: string;
  duration: string;
  timing: string;
  notes: string;
  confidence: number;           // 0–100
  low_confidence: boolean;
  schedule: ParsedSchedule;
}

export interface PrescriptionAnalysisResult {
  medicines: ExtractedMedicine[];
  general_instructions: string;
  explanation: string;           // Human-readable summary
  warnings: string[];
  overall_confidence: number;    // 0–100
  ocr_source: string;           // "doctr+trocr" | "gemini_fallback"
  quality?: QualityReport;       // Image quality info (from Python service)
  processing_note: string;       // e.g. "Used advanced OCR" or "Fell back to Gemini"
}

// ─── Groq Models (for AI structuring + fallback OCR) ───
const GROQ_STRUCTURE_MODEL = "llama-3.3-70b-versatile";
const GROQ_VISION_MODEL = "llama-3.2-11b-vision-instant";
// ─── Gemini Models (for AI structuring + fallback OCR) ───

const GEMINI_MODELS = [
  "gemini-1.5-flash",
];

// ─── Gemini: Structure extracted text (NOT raw OCR) ───

const STRUCTURING_PROMPT = `
Return ONLY valid JSON. Do NOT include markdown, backticks, or explanation.

You are a medical OCR correction system. 
You are given text extracted from a prescription image. Since handwriting is often messy, we use multiple OCR engines to read the text. You will receive output from both 'docTR' and 'Tesseract'.

Your job is to cross-reference these outputs, fix spelling mistakes, and recognize the true medicine names even if they are heavily distorted.

# 🧪 EXAMPLES OF OCR CORRECTION:
- "Cabergolin", "G lalyak", "N Cluyah", or "Caber" -> Cabergoline
- "025uy" -> 0.25mg
- "Thyronom" or "Thyronorn" -> Thyronorm
- "6ok Nitkye lok" or "Dailysl 6ok" -> Vitamin D3
- "tuice Lsee k2" or "tu weke" -> Twice weekly

# 🧠 EXTRACTION RULES
- Be BRAVE in correcting spelling errors. If it looks like a medicine name, correct it.
- Use both OCR outputs to piece together the truth. One engine might catch the dosage, the other might catch the name.
- If you see "T." or "Tab." before a word, it stands for "Tablet".
- If a word is just noise and doesn't map to a real medicine or dosage, DISCARD IT.

# 📦 OUTPUT FORMAT (STRICT JSON)
{
  "medicines": [
    {
      "name": "Full Medicine Name",
      "dosage": "e.g., 500mg",
      "frequency": "e.g., twice daily",
      "duration": "e.g., 5 days",
      "timing": "e.g., after food",
      "notes": "any special instructions",
      "confidence": 0, // Your confidence 0-100 in this extraction
      "rule_match": boolean // Set to true if you are 100% sure this is a medicine
    }
  ],
  "overall_instructions": "General notes found on paper",
  "explanation": "Simple 1-2 sentence summary for the patient",
  "warnings": []
}

🚨 NO GUESSING. NO MARKDOWN.
You are a highly accurate medical prescription parsing assistant.
You are given OCR-extracted text from a prescription image. The text has already been extracted by an OCR engine.

Your job is to STRUCTURE this text into a clean JSON format and provide a human-readable explanation.

---

# 📦 OUTPUT FORMAT (STRICT JSON ONLY)

{
  "medicines": [
    {
      "name": "",
      "dosage": "",
      "frequency": "",
      "duration": "",
      "timing": "",
      "notes": "",
      "confidence": 0
    }
  ],
  "general_instructions": "",
  "explanation": "",
  "warnings": []
}

---

# 🧠 RULES

## Medicine Name
* Extract exact name from the text
* Do NOT auto-correct spelling
* Preserve as written

## Dosage
* Examples: 500 mg, 5 ml, 1 tablet

## Frequency (IMPORTANT)
Interpret common abbreviations:
* OD → once daily
* BD → twice daily
* TDS → three times daily
* QID → four times daily
* SOS → only when needed
* 1-0-1 → morning and night
* 1-1-1 → morning, afternoon, and night
* 0-0-1 → night only
Return in FULL FORM (not abbreviation)

## Duration
* Examples: 3 days, 1 week
* If not mentioned → return ""

## Timing
Extract if mentioned: before food, after food, morning / night

## Notes
Include: special instructions, conditional usage (e.g., "if fever")

## Explanation (VERY IMPORTANT)
Write a clear, simple explanation of the entire prescription in 2-3 sentences.
Use plain language a non-medical person can understand.
Example: "You need to take Paracetamol 500mg twice a day (morning and night) after food for 5 days. Cetirizine should be taken once at bedtime for 3 days."

## Warnings
* If text is unclear, add: "Some text was hard to read — please verify"
* If something looks like it might not be a prescription, add a warning

## Confidence Score
For each medicine: 0–100 based on how clearly the information was present in the text.

---

# ⚠️ STRICT RULES
* DO NOT invent medicines
* DO NOT assume missing values
* DO NOT correct spelling
* DO NOT output anything except JSON
* If nothing is readable, return empty fields with warning
`;

// ─── Gemini: Vision fallback (raw OCR when Python service is down) ───

const VISION_FALLBACK_PROMPT = `
Return ONLY valid JSON. Do NOT include markdown, backticks, or explanation.

You are a highly accurate medical prescription parsing assistant.
Analyze this prescription image. Extract ALL medicine information you can see.

# 📦 OUTPUT FORMAT (STRICT JSON ONLY)

{
  "medicines": [
    {
      "name": "",
      "dosage": "",
      "frequency": "",
      "duration": "",
      "timing": "",
      "notes": "",
      "confidence": 0
    }
  ],
  "general_instructions": "",
  "explanation": "",
  "warnings": []
}

# RULES
- Extract medicine names EXACTLY as written (do NOT correct spelling)
- Interpret frequency abbreviations: OD=once daily, BD=twice daily, TDS=three times daily, SOS=as needed, 1-0-1=morning and night
- Provide a clear, simple "explanation" in plain language (2-3 sentences)
- Add confidence score 0-100 per medicine
- Add warnings for unclear text
- If this is NOT a prescription, return empty medicines with warning: "This does not appear to be a prescription"
- DO NOT invent medicines. DO NOT output anything except JSON.
`;

export class PrescriptionService {
  /**
   * Full prescription analysis pipeline.
   *
   * @param imageBase64 - Base64-encoded image (raw or data URI)
   * @returns Structured prescription data with confidence scores
   */
  static async analyzePrescription(imageBase64: string): Promise<PrescriptionAnalysisResult> {
    const groqKey = process.env.GROQ_API_KEY;
    const googleKey = process.env.GOOGLE_API_KEY;

    if (!groqKey) {
      throw new Error("GROQ_API_KEY is missing in .env. It is required for high-accuracy medical parsing.");
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      throw new Error("GOOGLE_API_KEY is not configured in .env");
    }

    // Strip data URI prefix if present
    const cleanBase64 = imageBase64.includes(",")
      ? imageBase64.split(",")[1]!
      : imageBase64;

    // ─── Step 1: Try Python OCR service ───
    console.log("[Pipeline] Step 1: Attempting Python OCR service...");

    // Add timeout to prevent hanging on slow OCR services
    let ocrResult: OCRAnalysisResult | null = null;
    try {
      ocrResult = await analyzeWithOCR(cleanBase64);
    } catch (err: any) {
      console.warn(`[Pipeline] OCR Service error: ${err.message}`);
      ocrResult = null; // Forces fallback to Vision
    }

    if (ocrResult !== null && ocrResult.ocr_source !== "tesseract_fallback") {
      // OCR service is running and using the high-accuracy engine
    const ocrResult = await analyzeWithOCR(cleanBase64);

    if (ocrResult !== null) {
      // OCR service is running
      if (!ocrResult.success) {
        // Image quality too poor
        console.log("[Pipeline] Image quality rejected by OCR service");
        return {
          medicines: [],
          general_instructions: "",
          explanation: "",
          warnings: [ocrResult.error || ocrResult.quality.guidance],
          overall_confidence: 0,
          ocr_source: "quality_rejected",
          quality: ocrResult.quality,
          processing_note: "Image quality was too poor for accurate scanning.",
        };
      }

      if (ocrResult.extracted_text.trim().length === 0) {
        console.log("[Pipeline] OCR found no text");
        return {
          medicines: [],
          general_instructions: "",
          explanation: "",
          warnings: ["No readable text was found in the image. Please ensure the prescription is clearly visible."],
          overall_confidence: 0,
          ocr_source: ocrResult.ocr_source,
          quality: ocrResult.quality,
          processing_note: "OCR completed but no text was detected.",
        };
      }

      // ─── Step 2: Send extracted text to Groq for structuring ───
      console.log(`[Pipeline] Step 2: Structuring ${ocrResult.word_count} words with Groq...`);
      console.log("[Pipeline] Raw OCR Text:", ocrResult.extracted_text);
      const structuredResult = await this.structureWithGroq(
        ocrResult.extracted_text,
        groqKey
      // ─── Step 2: Send extracted text to Gemini for structuring ───
      console.log(`[Pipeline] Step 2: Structuring ${ocrResult.word_count} words with Gemini...`);
      const structuredResult = await this.structureWithGemini(
        ocrResult.extracted_text,
        apiKey
      );

      // ─── Step 3: Enrich with rule-based parser ───
      console.log("[Pipeline] Step 3: Enriching with medical parser...");
      const enriched = enrichWithRuleParsing(structuredResult.medicines);

      // ─── Step 4: Validate and Merge Confidence ───
      const ocrConfidence = (ocrResult.overall_confidence || 0.5) * 100;

      const medicines: ExtractedMedicine[] = enriched
        .filter((med: any) => {
          // Reject junk or too-short names
          const name = med.name?.trim() || "";
          return name.length >= 2 && !name.match(/^[. ,;:]+$/);
        })
        .map((med: any) => {
          // Weighted Confidence Formula:
          // 0.6 * OCR_Accuracy + 0.3 * LLM_Certainty + 0.1 * RuleMatchScore
          const llmConf = med.confidence || 70;
          const ruleBonus = med.rule_match ? 100 : 50;

          const blendedConf = Math.round(
            (ocrConfidence * 0.6) +
            (llmConf * 0.3) +
            (ruleBonus * 0.1)
          );

          return {
            ...med,
            confidence: blendedConf,
            low_confidence: blendedConf < 75 || ocrConfidence < 60,
          };
        });
      // ─── Step 4: Merge OCR confidence with Gemini output ───
      const ocrConfidence = ocrResult.overall_confidence * 100;
      const medicines: ExtractedMedicine[] = enriched.map(med => ({
        ...med,
        // Blend OCR confidence with Gemini's per-medicine confidence
        confidence: Math.round((med.confidence * 0.6) + (ocrConfidence * 0.4)),
        low_confidence: med.confidence < 70 || ocrConfidence < 60,
      }));

      // Add quality warnings
      const warnings = [...(structuredResult.warnings || [])];
      if (ocrResult.quality) {
        for (const issue of ocrResult.quality.issues) {
          if (issue.severity === "warning") {
            warnings.push(issue.message);
          }
        }
      }
      if (ocrResult.low_confidence_words > 0) {
        warnings.push(
          `${ocrResult.low_confidence_words} word(s) had low OCR confidence and were refined with AI.`
        );
      }

      return {
        medicines,
        general_instructions: structuredResult.general_instructions || "",
        explanation: structuredResult.explanation || "",
        warnings,
        overall_confidence: Math.round(ocrConfidence),
        ocr_source: ocrResult.ocr_source,
        quality: ocrResult.quality,
        processing_note: `Advanced OCR (${ocrResult.ocr_source}) processed ${ocrResult.word_count} words in ${ocrResult.processing_time_ms}ms.`,
      };
    }

    // ─── Fallback: AI Vision (OCR service unavailable or poor) ───
    console.log(`[Pipeline] OCR service unavailable or low accuracy — falling back to vision model...`);
    
    try {
      if (googleKey && googleKey.startsWith("AIza")) {
        console.log("[Pipeline] Fallback: Local OCR failed/missing. Trying Gemini Vision...");
        return await this.fallbackToGeminiVision(cleanBase64, googleKey);
      } else if (groqKey) {
        return await this.fallbackToGroqVision(cleanBase64, groqKey);
      }
      
      throw new Error("No API key available for vision fallback.");
    } catch (fallbackErr: any) {
      console.error(`[Pipeline] Vision fallback failed:`, fallbackErr.message);
      return {
        medicines: [],
        general_instructions: "",
        explanation: "The scanning service is currently experiencing technical difficulties. Please try again later.",
        warnings: ["Vision model fallback failed. Check your API configuration."],
        overall_confidence: 0,
        ocr_source: "error",
        processing_note: `Both OCR service and vision fallback failed.`
      };
    }
  }

  /**
   * Use AI to structure already-extracted text (NOT raw OCR).
   */
  private static async structureWithGroq(
    // ─── Fallback: Gemini Vision (OCR service unavailable) ───
    console.log("[Pipeline] OCR service unavailable — falling back to Gemini Vision...");
    return await this.fallbackToGeminiVision(cleanBase64, apiKey);
  }

  /**
   * Use Gemini to structure already-extracted text (NOT raw OCR).
   */
  private static async structureWithGemini(
    extractedText: string,
    apiKey: string,
  ): Promise<{
    medicines: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      timing: string;
      notes: string;
      confidence: number;
    }>;
    general_instructions: string;
    explanation: string;
    warnings: string[];
  }> {
    console.log("[Groq] Structuring text with Llama 3.3-70B (Medical De-noising)...");
    
    const requestBody = {
      model: GROQ_STRUCTURE_MODEL,
      messages: [
        { role: "system", content: STRUCTURING_PROMPT },
        { role: "user", content: `Here is the OCR-extracted text from a prescription:\n\n${extractedText}` },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    };

    return await this.callGroq(requestBody, apiKey);
    const requestBody = {
      contents: [
        {
          parts: [
            { text: STRUCTURING_PROMPT },
            { text: `Here is the OCR-extracted text from a prescription:\n\n${extractedText}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,          // Low temperature for accuracy
        maxOutputTokens: 2048,
      },
    };

    return await this.callGemini(requestBody, apiKey);
  }

  /**
   * Fallback: Use Gemini Vision for both OCR and structuring.
   * Only used when Python OCR service is unavailable.
   */
  private static async fallbackToGeminiVision(
    imageBase64: string,
    apiKey: string,
  ): Promise<PrescriptionAnalysisResult> {
    console.log("[Gemini SDK] Calling model: gemini-1.5-flash vision...");
    const parsed = await this.callGemini([VISION_FALLBACK_PROMPT, imageBase64], apiKey, true);

    // Enrich with rule-based parser
    const enriched = enrichWithRuleParsing(parsed.medicines);

    const medicines: ExtractedMedicine[] = enriched.map((med: ParsedMedicine) => ({
      ...med,
      confidence: Math.round(med.confidence * 0.95), // Gemini is very accurate
      low_confidence: med.confidence < 75,
    }));

    return {
      medicines,
      general_instructions: parsed.general_instructions || "",
      explanation: parsed.explanation || "",
      warnings: [...(parsed.warnings || []), "ℹ️ Used Gemini Vision for high-accuracy handwriting recognition."],
      overall_confidence: medicines.length > 0
        ? Math.round(medicines.reduce((s, m) => s + m.confidence, 0) / medicines.length)
        : 0,
      ocr_source: "gemini_vision",
      processing_note: "Used Gemini 1.5 Flash for doctor-grade handwriting recognition.",
    };
  }

  /**
   * Fallback: Use Groq Vision for both OCR and structuring.
   */
  private static async fallbackToGroqVision(
    imageBase64: string,
    apiKey: string,
  ): Promise<PrescriptionAnalysisResult> {
    const requestBody = {
      model: GROQ_VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: VISION_FALLBACK_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 2048,
    };

    const parsed = await this.callGroq(requestBody, apiKey);
    const requestBody = {
      contents: [
        {
          parts: [
            { text: VISION_FALLBACK_PROMPT },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    };

    const parsed = await this.callGemini(requestBody, apiKey);

    // Enrich with rule-based parser
    const enriched = enrichWithRuleParsing(parsed.medicines);

    const medicines: ExtractedMedicine[] = enriched.map((med: ParsedMedicine) => ({
      ...med,
    const medicines: ExtractedMedicine[] = enriched.map(med => ({
      ...med,
      // Slightly lower confidence for Gemini-only mode
      confidence: Math.round(med.confidence * 0.85),
      low_confidence: med.confidence < 75,
    }));

    const warnings = [...(parsed.warnings || [])];
    warnings.push("⚠️ Used Gemini Vision fallback (OCR service not available). For best accuracy, start the OCR service.");

    return {
      medicines,
      general_instructions: parsed.general_instructions || "",
      explanation: parsed.explanation || "",
      warnings: [...(parsed.warnings || []), "⚠️ Used Groq Vision fallback."],
      overall_confidence: medicines.length > 0
        ? Math.round(medicines.reduce((s, m) => s + m.confidence, 0) / medicines.length)
        : 0,
      ocr_source: "groq_vision_fallback",
      processing_note: "Used Groq Vision as fallback.",
    };
  }

  /**
   * Call Gemini API using the official SDK.
   */
  private static async callGemini(request: any, apiKey: string, isVision: boolean = false): Promise<any> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash-latest",
      generationConfig: {
        temperature: isVision ? 0.2 : 0.1,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      }
    });

    try {
      let result;
      if (isVision) {
        // request is [prompt, imageBase64]
        const [prompt, imageBase64] = request;
        result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64
            }
          }
        ]);
      } else {
        // request is prompt string
        result = await model.generateContent(request);
      }

      const response = await result.response;
      const text = response.text();
      const cleanedText = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      return JSON.parse(cleanedText);
    } catch (err: any) {
      console.error("[Gemini SDK] Request failed:", err.message);
      throw err;
    }
  }

  /**
   * Call Groq API (OpenAI-compatible).
   */
  private static async callGroq(requestBody: any, apiKey: string): Promise<any> {
    const apiEndpoint = "https://api.groq.com/openai/v1/chat/completions";

    console.log(`[Groq] Calling model: ${requestBody.model}...`);

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as any;
      const resultText = data.choices[0]?.message?.content;

      if (!resultText) {
        throw new Error("Groq returned an empty response.");
      }

      const cleanedText = resultText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      return JSON.parse(cleanedText);
    } catch (err: any) {
      console.error("[Groq] Request failed:", err.message);
      throw err;
    }
      warnings,
      overall_confidence: medicines.length > 0
        ? Math.round(medicines.reduce((s, m) => s + m.confidence, 0) / medicines.length)
        : 0,
      ocr_source: "gemini_fallback",
      processing_note: "Used Gemini Vision as fallback. Start the Python OCR service for better accuracy.",
    };
  }

  /**
   * Call Gemini API with retry across model versions.
   */
  private static async callGemini(requestBody: any, apiKey: string): Promise<any> {
    let lastError: Error | null = null;

    for (const model of GEMINI_MODELS) {
      const apiEndpoint = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

      console.log(`[Gemini] Trying model: ${model}...`);

      try {
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Gemini] ${model} error: ${response.status} ${errorText}`);

          if (response.status === 404) {
            lastError = new Error(`Model ${model} not available (404)`);
            continue;
          }

          throw new Error(`Gemini API error: ${response.status} ${errorText}`);
        }

        const raw = await response.text();
        console.log(`[Gemini] ${model} responded successfully`);

        const data = JSON.parse(raw) as any;

        const candidates = data.candidates || [];
        if (
          candidates.length === 0 ||
          !candidates[0]?.content?.parts?.[0]?.text
        ) {
          console.error("[Gemini] Empty or malformed response");
          throw new Error(
            "The AI returned an empty response. Please try again with a clearer image."
          );
        }

        let resultText: string = candidates[0].content.parts[0].text;

        // Clean up markdown fences
        resultText = resultText
          .replace(/```json\s*/gi, "")
          .replace(/```\s*/g, "")
          .trim();

        try {
          const parsed = JSON.parse(resultText);
          console.log(`[Gemini] Parsed ${parsed.medicines?.length ?? 0} medicines.`);
          return parsed;
        } catch (parseErr) {
          console.error("[Gemini] JSON parse failed:", resultText.slice(0, 300));
          throw new Error(
            "The AI response was malformed. Please try again."
          );
        }
      } catch (err: any) {
        if (err.message?.includes("not available (404)")) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }

    console.error("[Gemini] All models failed. Last error:", lastError?.message);
    throw new Error(
      `No compatible Gemini model found. Tried: ${GEMINI_MODELS.join(", ")}. ` +
      `Please verify your GOOGLE_API_KEY at https://aistudio.google.com/`
    );
  }
}
