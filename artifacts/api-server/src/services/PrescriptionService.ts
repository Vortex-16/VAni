/**
 * Prescription Service — Orchestrator for the OCR → AI → Parser pipeline.
 *
 * Pipeline:
 *   1. Send image to Python OCR service (docTR + TrOCR)
 *   2. If OCR service unavailable → fall back to Gemini Vision for raw OCR
 *   3. Send extracted text to Gemini for medical structuring + explanation
 *   4. Enrich with rule-based medical parser (schedule, timing)
 *   5. Return structured result with per-medicine confidence scores
 *
 * Gemini is NEVER used for raw OCR when the Python service is available.
 */

import { analyzeWithOCR, type OCRAnalysisResult, type QualityReport } from "./ocrClient";
import { enrichWithRuleParsing, type ParsedMedicine, type ParsedSchedule } from "./medicalParser";

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

// ─── Gemini Models (for AI structuring + fallback OCR) ───

const GEMINI_MODELS = [
  "gemini-1.5-flash",
];

// ─── Gemini: Structure extracted text (NOT raw OCR) ───

const STRUCTURING_PROMPT = `
Return ONLY valid JSON. Do NOT include markdown, backticks, or explanation.

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

      // ─── Step 2: Send extracted text to Gemini for structuring ───
      console.log(`[Pipeline] Step 2: Structuring ${ocrResult.word_count} words with Gemini...`);
      const structuredResult = await this.structureWithGemini(
        ocrResult.extracted_text,
        apiKey
      );

      // ─── Step 3: Enrich with rule-based parser ───
      console.log("[Pipeline] Step 3: Enriching with medical parser...");
      const enriched = enrichWithRuleParsing(structuredResult.medicines);

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
