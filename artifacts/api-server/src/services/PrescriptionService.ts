/**
 * Prescription Service — Orchestrator for the OCR → AI → Parser pipeline.
 *
 * Pipeline:
 *   1. Send image to NVIDIA nemotron-parse model for raw OCR
 *   2. Send extracted text to Groq for medical structuring + explanation (Llama 3.3)
 *   3. Enrich with rule-based medical parser (schedule, timing)
 *   4. Return structured result with per-medicine confidence scores
 */

import { enrichWithRuleParsing, type ParsedMedicine, type ParsedSchedule } from "./medicalParser";
import { type QualityReport } from "./ocrClient";

// ─── Output Interfaces ───

interface NvidiaResponse {
  choices: Array<{
    message: {
      tool_calls?: Array<{
        function: {
          arguments: string;
        };
      }>;
    };
  }>;
}

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface ExtractedMedicine {
  name: string;
  dosage: string;
  frequency: string;
  frequency_code: string;
  duration: string;
  timing: string;
  notes: string;
  confidence: number;
  low_confidence: boolean;
  schedule: ParsedSchedule;
}

export interface PrescriptionAnalysisResult {
  medicines: ExtractedMedicine[];
  general_instructions: string;
  explanation: string;
  warnings: string[];
  overall_confidence: number;
  ocr_source: string;
  quality?: QualityReport;
  processing_note: string;
}

// ─── Groq Models ───
const GROQ_STRUCTURE_MODEL = "llama-3.3-70b-versatile";

// ─── Groq: Structure extracted text ───

const STRUCTURING_PROMPT = `
Return ONLY valid JSON. Do NOT include markdown, backticks, or explanation.

You are a medical OCR correction system. 
You are given text extracted from a prescription image by an OCR engine.

Your job is to fix spelling mistakes and recognize the true medicine names even if they are heavily distorted, and output them in a structured JSON format.

# 🧪 EXAMPLES OF OCR CORRECTION:
- "Cabergolin", "G lalyak", "N Cluyah", or "Caber" -> Cabergoline
- "025uy" -> 0.25mg
- "Thyronom" or "Thyronorn" -> Thyronorm
- "6ok Nitkye lok" or "Dailysl 6ok" -> Vitamin D3
- "tuice Lsee k2" or "tu weke" -> Twice weekly

# 🧠 EXTRACTION RULES
- Be BRAVE in correcting spelling errors. If it looks like a medicine name, correct it.
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

---

# 🧠 RULES

## Medicine Name
* Extract exact name from the text
* Do NOT auto-correct spelling if it's completely unreadable
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
* DO NOT correct spelling unless confident
* DO NOT output anything except JSON
* If nothing is readable, return empty fields with warning
`;

export class PrescriptionService {
  /**
   * Full prescription analysis pipeline.
   *
   * @param imageBase64 - Base64-encoded image (raw or data URI)
   * @returns Structured prescription data with confidence scores
   */
  static async analyzePrescription(imageBase64: string): Promise<PrescriptionAnalysisResult> {
    const nvidiaKey = process.env.NVIDIA_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (!nvidiaKey) {
      throw new Error("NVIDIA_API_KEY is not configured in .env");
    }
    if (!groqKey) {
      throw new Error("GROQ_API_KEY is not configured in .env");
    }

    // Strip data URI prefix if present
    const cleanBase64 = imageBase64.includes(",")
      ? imageBase64.split(",")[1]!
      : imageBase64;

    console.log("[Pipeline] Step 1: Attempting NVIDIA Nemotron OCR service...");

    let extractedText = "";
    try {
      extractedText = await this.analyzeWithNemotron(cleanBase64, nvidiaKey);
    } catch (err: any) {
      console.error(`[Pipeline] NVIDIA Nemotron Service error: ${err.message}`);
      throw new Error("NVIDIA Nemotron OCR failed: " + err.message);
    }

    if (extractedText.trim().length === 0) {
      console.log("[Pipeline] OCR found no text");
      return {
        medicines: [],
        general_instructions: "",
        explanation: "",
        warnings: ["No readable text was found in the image. Please ensure the prescription is clearly visible."],
        overall_confidence: 0,
        ocr_source: "nvidia_nemotron",
        processing_note: "OCR completed but no text was detected.",
      };
    }

    console.log(`[Pipeline] Step 2: Structuring text with Groq (${GROQ_STRUCTURE_MODEL})...`);
    const structuredResult = await this.structureWithGroq(extractedText, groqKey);

    console.log("[Pipeline] Step 3: Enriching with medical parser...");
    const enriched = enrichWithRuleParsing(structuredResult.medicines);

    const medicines: ExtractedMedicine[] = enriched
      .filter((med: any) => {
        const name = med.name?.trim() || "";
        return name.length >= 2 && !name.match(/^[. ,;:]+$/);
      })
      .map((med: any) => {
        const confidence = med.confidence || 85;
        return {
          ...med,
          confidence: confidence,
          low_confidence: confidence < 75,
        };
      });

    return {
      medicines,
      general_instructions: structuredResult.overall_instructions || "",
      explanation: structuredResult.explanation || "",
      warnings: structuredResult.warnings || [],
      overall_confidence: medicines.length > 0
        ? Math.round(medicines.reduce((s, m) => s + m.confidence, 0) / medicines.length)
        : 0,
      ocr_source: "nvidia_nemotron",
      processing_note: "Used NVIDIA Nemotron for OCR and Groq for structuring.",
    };
  }

  /**
   * Use NVIDIA nemotron-parse model for OCR extraction.
   */
  private static async analyzeWithNemotron(imageBase64: string, apiKey: string): Promise<string> {
    const nvaiUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
    
    // As per user provided code, assume jpeg
    const mime = "image/jpeg";
    const mediaTag = `<img src="data:${mime};base64,${imageBase64}" />`;
    const toolName = "markdown_no_bbox";

    const requestBody = {
      model: "nvidia/nemotron-parse",
      messages: [
        {
          role: "user",
          content: mediaTag
        }
      ],
      tools: [
        { type: "function", function: { name: toolName } }
      ],
      tool_choice: { type: "function", function: { name: toolName } },
      max_tokens: 8192,
    };

    const response = await fetch(nvaiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NVIDIA API error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as NvidiaResponse;
    
    try {
      const toolCalls = data.choices[0]?.message?.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        throw new Error("No tool calls found in NVIDIA response");
      }
      
      const functionArgs = toolCalls[0].function.arguments;
      const parsedArgs = JSON.parse(functionArgs);
      
      // Expected format is an array with a text object
      // e.g. [{"text": "markdown string"}]
      if (Array.isArray(parsedArgs) && parsedArgs.length > 0 && parsedArgs[0].text !== undefined) {
        return parsedArgs[0].text;
      }
      
      // fallback if it's an object instead of array
      if (parsedArgs.text) {
        return parsedArgs.text;
      }
      
      throw new Error("Could not find 'text' in NVIDIA response arguments.");
    } catch (e: any) {
      console.error("Failed to parse NVIDIA response:", JSON.stringify(data).substring(0, 500));
      throw new Error("Failed to parse OCR response: " + e.message);
    }
  }

  /**
   * Use Groq to structure already-extracted text.
   */
  private static async structureWithGroq(
    extractedText: string,
    apiKey: string,
  ): Promise<any> {
    const apiEndpoint = "https://api.groq.com/openai/v1/chat/completions";

    const requestBody = {
      model: GROQ_STRUCTURE_MODEL,
      messages: [
        { role: "system", content: STRUCTURING_PROMPT },
        { role: "user", content: `Here is the OCR-extracted text from a prescription:\\n\\n${extractedText}` },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    };

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

    const data = (await response.json()) as GroqResponse;
    const resultText = data.choices[0]?.message?.content;

    if (!resultText) {
      throw new Error("Groq returned an empty response.");
    }

    const cleanedText = resultText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleanedText);
  }
}
