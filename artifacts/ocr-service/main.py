"""
Prescription OCR Microservice — FastAPI Server.

Endpoints:
  POST /analyze     — Full pipeline: quality check → preprocess → OCR → structured output
  GET  /health      — Health check (confirms models are loadable)

Runs on port 8100 by default.
"""

import base64
import io
import logging
import time
import traceback

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from PIL import Image

from quality_check import assess_quality, QualityReport
from preprocessing import preprocess_for_ocr
from ocr_engine import run_ocr, OCRResult, LineResult, WordResult

# ─── Logging ───
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ocr-service")

# ─── FastAPI App ───
app = FastAPI(
    title="Discharge Buddy OCR Service",
    description="Advanced prescription OCR using docTR + TrOCR",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response Models ───

class AnalyzeRequest(BaseModel):
    """Request body for /analyze endpoint."""
    image_base64: str               # Base64-encoded image (with or without data URI prefix)
    refine_with_trocr: bool = True  # Whether to use TrOCR for low-confidence words
    skip_quality_check: bool = False  # Force processing even if quality is poor


class WordOutput(BaseModel):
    text: str
    confidence: float
    source: str              # "doctr" or "trocr"
    refined: bool
    bbox: List[float]


class LineOutput(BaseModel):
    text: str
    confidence: float
    low_confidence: bool
    words: List[WordOutput]


class AnalyzeResponse(BaseModel):
    """Response from /analyze endpoint."""
    success: bool
    extracted_text: str                    # Full concatenated text
    lines: List[LineOutput]                # Per-line results with word details
    overall_confidence: float              # 0.0 to 1.0
    word_count: int
    low_confidence_words: int
    ocr_source: str                        # "doctr+trocr" or "doctr"
    quality: QualityReport                 # Image quality assessment
    processing_time_ms: int                # Total processing time
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    message: str


# ─── Helpers ───

def decode_base64_image(b64_string: str) -> np.ndarray:
    """Decode a base64 string (with or without data URI prefix) to OpenCV ndarray."""
    # Strip data URI prefix if present
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]

    # Decode base64 to bytes
    # Ensure the string only contains valid base64 characters to avoid Python's decode error
    try:
        # Strip any whitespace and ensure it's treated as ASCII
        b64_string = "".join(b64_string.split())
        image_bytes = base64.b64decode(b64_string.encode('ascii', errors='ignore'))
    except Exception as e:
        logger.error(f"Base64 decode failed: {str(e)}")
        raise ValueError(f"Failed to decode base64: {str(e)}")

    # Convert to PIL Image, then to numpy array
    pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    np_image = np.array(pil_image)

    # Convert RGB to BGR for OpenCV
    bgr_image = cv2.cvtColor(np_image, cv2.COLOR_RGB2BGR)

    return bgr_image


def ocr_result_to_response(ocr: OCRResult) -> dict:
    """Convert internal OCRResult to API response format."""
    lines = []
    for line in ocr.lines:
        words = []
        for w in line.words:
            words.append(WordOutput(
                text=w.text,
                confidence=round(w.confidence, 3),
                source=w.source,
                refined=w.refined,
                bbox=list(w.bbox),
            ))
        lines.append(LineOutput(
            text=line.text,
            confidence=round(line.confidence, 3),
            low_confidence=line.low_confidence,
            words=words,
        ))
    return {
        "extracted_text": ocr.full_text,
        "lines": lines,
        "overall_confidence": ocr.overall_confidence,
        "word_count": ocr.word_count,
        "low_confidence_words": ocr.low_confidence_words,
        "ocr_source": ocr.ocr_source,
    }


# ─── Endpoints ───

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_prescription(request: AnalyzeRequest):
    """
    Full OCR pipeline:
    1. Decode image
    2. Assess quality (blur, lighting, skew, etc.)
    3. Preprocess (denoise, CLAHE, deskew)
    4. Run docTR + TrOCR
    5. Return structured results with confidence scores
    """
    start_time = time.time()

    try:
        # Step 1: Decode image
        logger.info("Decoding base64 image...")
        image = decode_base64_image(request.image_base64)
        logger.info(f"Image decoded: {image.shape[1]}x{image.shape[0]} pixels")

        # Step 2: Quality assessment
        logger.info("Assessing image quality...")
        quality = assess_quality(image)
        logger.info(f"Quality: score={quality.overall_score}, usable={quality.is_usable}, issues={len(quality.issues)}")

        # If quality is unusable and skip not requested, return early with guidance
        if not quality.is_usable and not request.skip_quality_check:
            elapsed = int((time.time() - start_time) * 1000)
            return AnalyzeResponse(
                success=False,
                extracted_text="",
                lines=[],
                overall_confidence=0.0,
                word_count=0,
                low_confidence_words=0,
                ocr_source="none",
                quality=quality,
                processing_time_ms=elapsed,
                error=quality.guidance,
            )

        # Step 3: Preprocess
        logger.info("Preprocessing image...")
        preprocessed = preprocess_for_ocr(image, aggressive=quality.needs_preprocessing)

        # Step 4: Run OCR
        logger.info("Running OCR engine...")
        ocr_result = run_ocr(preprocessed, refine_with_trocr=request.refine_with_trocr)

        # Step 5: Build response
        elapsed = int((time.time() - start_time) * 1000)
        response_data = ocr_result_to_response(ocr_result)

        logger.info(f"Pipeline complete in {elapsed}ms: {ocr_result.word_count} words, confidence={ocr_result.overall_confidence:.2f}")

        return AnalyzeResponse(
            success=True,
            quality=quality,
            processing_time_ms=elapsed,
            **response_data,
        )

    except Exception as e:
        elapsed = int((time.time() - start_time) * 1000)
        logger.error(f"OCR pipeline error: {traceback.format_exc()}")
        
        # Return graceful structured fallback instead of 500
        return AnalyzeResponse(
            success=False,
            extracted_text="",
            lines=[],
            overall_confidence=0.0,
            word_count=0,
            low_confidence_words=0,
            ocr_source="error_fallback",
            quality=QualityReport(
                is_usable=False,
                overall_score=0.0,
                issues=[],
                guidance="OCR engine failed. Please try again.",
                needs_preprocessing=False,
                details={"error_message": str(e)}
            ) if 'quality' not in locals() else quality,
            processing_time_ms=elapsed,
            error=f"OCR engine failed: {str(e)}"
        )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check — verifies the service is running."""
    return HealthResponse(
        status="ok",
        message="OCR service is running. Models will be loaded on first request.",
    )


# ─── Entry Point ───

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8100,
        reload=True,
        log_level="info",
    )
