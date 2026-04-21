import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { PrescriptionService } from "../services/PrescriptionService";

const router = Router();

/**
 * POST /api/ocr/scan
 *
 * Accepts a base64-encoded prescription image and returns structured
 * medicine data with confidence scores and quality feedback.
 *
 * Request body: { imageBase64: string }
 * Response: PrescriptionAnalysisResult (see PrescriptionService.ts)
 */
router.post("/scan", requireAuth, async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    // ─── Input Validation ───
    if (!imageBase64) {
      return res.status(400).json({
        error: "Missing imageBase64 in request body",
        medicines: [],
        warnings: ["No image data was provided."],
      });
    }

    if (typeof imageBase64 !== "string") {
      return res.status(400).json({
        error: "imageBase64 must be a string",
        medicines: [],
        warnings: ["Invalid image data format."],
      });
    }

    // Check base64 size (rough estimate: 1 char ≈ 0.75 bytes)
    const estimatedSizeMB = (imageBase64.length * 0.75) / (1024 * 1024);
    if (estimatedSizeMB > 20) {
      return res.status(413).json({
        error: "Image too large",
        medicines: [],
        warnings: [`Image is approximately ${Math.round(estimatedSizeMB)}MB. Maximum is 20MB. Try reducing image quality.`],
      });
    }

    // Validate it looks like base64
    const b64Part = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    if (!b64Part || b64Part.length < 100) {
      return res.status(400).json({
        error: "Image data appears to be empty or corrupted",
        medicines: [],
        warnings: ["The image data is too small or corrupted. Please capture the image again."],
      });
    }

    // ─── Run Pipeline ───
    console.log(`[OCR Route] Processing image (~${Math.round(estimatedSizeMB * 10) / 10}MB)...`);

    const result = await PrescriptionService.analyzePrescription(imageBase64);

    console.log(
      `[OCR Route] Pipeline complete: ${result.medicines.length} medicines, ` +
      `confidence=${result.overall_confidence}%, source=${result.ocr_source}`
    );

    return res.json(result);
  } catch (error: any) {
    console.error("[OCR Route] Error:", error.message);
    return res.status(500).json({
      error: error.message,
      medicines: [],
      warnings: ["An error occurred while processing the prescription. Please try again."],
      overall_confidence: 0,
    });
  }
});

export default router;
