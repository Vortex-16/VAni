/**
 * OCR Client — HTTP client for the Python OCR microservice.
 *
 * Calls the FastAPI OCR service for image analysis, with:
 * - Configurable timeout
 * - Automatic retry on transient failures
 * - Graceful fallback flag when service is unavailable
 */

export interface OCRWord {
  text: string;
  confidence: number;
  source: string;       // "doctr" or "trocr"
  refined: boolean;
  bbox: number[];
}

export interface OCRLine {
  text: string;
  confidence: number;
  low_confidence: boolean;
  words: OCRWord[];
}

export interface QualityIssue {
  code: string;
  severity: string;     // "error" | "warning"
  message: string;
  score: number;
}

export interface QualityReport {
  is_usable: boolean;
  overall_score: number;
  issues: QualityIssue[];
  guidance: string;
  needs_preprocessing: boolean;
  details: Record<string, unknown>;
}

export interface OCRAnalysisResult {
  success: boolean;
  extracted_text: string;
  lines: OCRLine[];
  overall_confidence: number;
  word_count: number;
  low_confidence_words: number;
  ocr_source: string;
  quality: QualityReport;
  processing_time_ms: number;
  error?: string;
}

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || "http://localhost:8100";
const OCR_TIMEOUT_MS = 120_000;   // 2 minutes — model inference can be slow on first run
const MAX_RETRIES = 2;

/**
 * Check if the OCR service is running.
 */
export async function isOCRServiceHealthy(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${OCR_SERVICE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Send an image to the Python OCR service for analysis.
 *
 * @param imageBase64 - Base64-encoded image (raw or data URI).
 * @param options - Optional flags.
 * @returns OCR analysis result, or null if the service is unavailable.
 */
export async function analyzeWithOCR(
  imageBase64: string,
  options?: {
    refineWithTrOCR?: boolean;
    skipQualityCheck?: boolean;
  }
): Promise<OCRAnalysisResult | null> {
  const body = {
    image_base64: imageBase64,
    refine_with_trocr: options?.refineWithTrOCR ?? true,
    skip_quality_check: options?.skipQualityCheck ?? false,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

      console.log(`[OCR Client] Attempt ${attempt + 1}/${MAX_RETRIES + 1} — sending to ${OCR_SERVICE_URL}/analyze`);

      const response = await fetch(`${OCR_SERVICE_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[OCR Client] Service returned ${response.status}: ${errorBody}`);

        // Don't retry on 4xx client errors
        if (response.status >= 400 && response.status < 500) {
          const parsed = JSON.parse(errorBody).detail;
          throw new Error(parsed?.error || `OCR service error: ${response.status}`);
        }

        lastError = new Error(`OCR service error: ${response.status}`);
        continue;
      }

      const result = (await response.json()) as OCRAnalysisResult;
      console.log(
        `[OCR Client] Success: ${result.word_count} words, ` +
        `confidence=${result.overall_confidence}, ` +
        `time=${result.processing_time_ms}ms, ` +
        `source=${result.ocr_source}`
      );

      return result;
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.error("[OCR Client] Request timed out");
        lastError = new Error("OCR service request timed out");
      } else if (err.message?.includes("ECONNREFUSED") || err.cause?.code === "ECONNREFUSED") {
        console.warn("[OCR Client] OCR service is not running — will fall back to Gemini");
        return null;  // Service not running, signal fallback
      } else {
        lastError = err;
        console.error(`[OCR Client] Error: ${err.message}`);
      }
    }

    // Wait before retry
    if (attempt < MAX_RETRIES) {
      const delay = 1000 * (attempt + 1);
      console.log(`[OCR Client] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.error(`[OCR Client] All ${MAX_RETRIES + 1} attempts failed. Last error: ${lastError?.message}`);
  return null;  // Signal fallback
}
