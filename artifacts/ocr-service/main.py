"""
Discharge-Buddy OCR & Report Service
=====================================
Lightweight FastAPI service using Google Gemini Vision for OCR.
No heavy ML models. No PyTorch. No docTR. No OpenCV.

Endpoints:
  POST /analyze          - Extract medications from a prescription image
  POST /generate-report  - Generate a PDF recovery report
  GET  /health           - Health check
"""

import logging
import os
import io
import json
import base64
import traceback

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv
from PIL import Image

import google.generativeai as genai

# ─── Setup ────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

env_path = os.path.join(os.path.dirname(__file__), "../../.env")
load_dotenv(env_path)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    logger.error("GOOGLE_API_KEY not found in .env — OCR will fail!")
else:
    genai.configure(api_key=GOOGLE_API_KEY)
    logger.info("Google Gemini API key loaded successfully.")

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Discharge-Buddy OCR & Report Service (Gemini)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Data Models ──────────────────────────────────────────────────────────────
class MedicationInfo(BaseModel):
    name: str
    dosage: str = ""
    status: str = "Active"

class ReportRequest(BaseModel):
    name: str
    period: str = "Last 7 Days"
    adherence: int = 0
    taken: int = 0
    missed: int = 0
    total: int = 0
    medications: List[MedicationInfo] = []
    insights: List[str] = []
    summary: str = ""
    recommendations: List[str] = []


# ─── Gemini Vision OCR ────────────────────────────────────────────────────────

def _gemini_vision_ocr(image_b64: str) -> str:
    """
    Send a base64 image to Google Gemini Vision to extract all text
    from a prescription or medical document.
    """
    if not GOOGLE_API_KEY:
        raise RuntimeError("GOOGLE_API_KEY is not configured.")

    # Strip data URI prefix if present
    if "," in image_b64:
        image_b64 = image_b64.split(",")[1]

    # Decode and re-encode as clean JPEG via Pillow
    try:
        img_bytes = base64.b64decode(image_b64)
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        out_buf = io.BytesIO()
        img.save(out_buf, format="JPEG", quality=90)
        out_buf.seek(0)
        pil_image = Image.open(out_buf)
    except Exception as e:
        raise ValueError(f"Invalid image data: {e}")

    model = genai.GenerativeModel("gemini-1.5-flash")
    prompt = (
        "You are a medical OCR expert. Extract ALL text from this prescription or "
        "medical discharge document exactly as written. Include medicine names, dosages, "
        "frequencies, timings, doctor notes, and patient instructions. "
        "Do NOT summarize or interpret. Output the raw extracted text only."
    )

    logger.info("Sending image to Google Gemini Vision for OCR...")
    response = model.generate_content([prompt, pil_image])
    extracted_text = response.text.strip()
    logger.info(f"Gemini OCR extracted {len(extracted_text)} characters.")
    return extracted_text


def _gemini_extract_medications(ocr_text: str) -> list:
    """
    Use Gemini to parse raw OCR text into structured medication objects.
    """
    if not GOOGLE_API_KEY:
        raise RuntimeError("GOOGLE_API_KEY is not configured.")

    prompt = f"""You are a medical data extraction expert.
Below is raw OCR text from a doctor's prescription or discharge summary.

TASK:
1. Extract all medications listed.
2. For each medication, find: name, dosage (e.g. 500mg), frequency (e.g. BD, TID, Once Daily), duration, and instructions.
3. Translate shorthand: BD→Twice Daily, OD→Once Daily, TDS→Thrice Daily, HS→At Bedtime, SOS→If needed.
4. If text is messy, use medical knowledge to infer the correct medicine name.

RAW TEXT:
{ocr_text}

FORMAT RESPONSE AS A VALID JSON ARRAY ONLY. No preamble, no markdown, no code blocks:
[
    {{"name": "...", "dosage": "...", "frequency": "...", "duration": "...", "instructions": "..."}}
]"""

    model = genai.GenerativeModel("gemini-1.5-flash")
    logger.info("Extracting medication entities via Gemini...")
    response = model.generate_content(prompt)
    raw = response.text.strip().replace("```json", "").replace("```", "").strip()
    medications = json.loads(raw)
    logger.info(f"Extracted {len(medications)} medications.")
    return medications


def _gemini_enrich_report(data: dict) -> dict:
    """
    Use Gemini to generate a personalized, supportive recovery report summary.
    """
    if not GOOGLE_API_KEY:
        return {}

    med_names = ", ".join([
        m["name"] if isinstance(m, dict) else m
        for m in data.get("medications", [])
    ])

    prompt = f"""You are a healthcare AI assistant generating a personalized recovery report summary.

Patient Data:
- Name: {data['name']}
- Adherence: {data['adherence']}%
- Doses: {data['taken']} taken / {data['total']} total ({data['missed']} missed)
- Medications: {med_names}

TASK:
1. Write a personalized summary (2-3 lines). Use the patient's name. Tone: calm, supportive, human.
2. Generate 2-3 behavioral insights (patterns, consistency).
3. Generate 2-3 practical, actionable recommendations (no medical advice).

FORMAT AS JSON ONLY. No preamble, no markdown:
{{"summary": "...", "insights": ["...", "..."], "recommendations": ["...", "..."]}}"""

    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
    raw = response.text.strip().replace("```json", "").replace("```", "").strip()
    return json.loads(raw)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/analyze")
async def analyze_prescription(request: Request):
    """
    Analyze a prescription image using Google Gemini Vision.
    Input: { "image": "<base64 string>" }
    Output: { "success": true, "ocr": {...}, "entities": [...] }
    """
    try:
        body = await request.json()
        image_b64 = body.get("image")
        if not image_b64:
            raise HTTPException(status_code=400, detail="No image data provided.")

        # Step 1: OCR via Gemini Vision
        ocr_text = _gemini_vision_ocr(image_b64)

        # Step 2: Entity Extraction via Gemini
        try:
            medications = _gemini_extract_medications(ocr_text)
        except Exception as e:
            logger.warning(f"Medication extraction failed: {e}. Returning raw text only.")
            medications = []

        return {
            "success": True,
            "ocr": {
                "full_text": ocr_text,
                "word_count": len(ocr_text.split()),
                "source": "gemini-1.5-flash-vision"
            },
            "entities": medications
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis failed:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-report")
async def generate_report(request: ReportRequest):
    """
    Generate a premium AI-enriched PDF recovery report.
    """
    try:
        from report_generator import RecoveryReportGenerator

        data_dict = request.dict()

        # Enrich with AI-generated content
        try:
            enrichment = _gemini_enrich_report(data_dict)
            if enrichment:
                data_dict["summary"] = enrichment.get("summary", data_dict["summary"])
                data_dict["insights"] = enrichment.get("insights", data_dict["insights"])
                data_dict["recommendations"] = enrichment.get("recommendations", data_dict["recommendations"])
                logger.info("Gemini AI enrichment applied to report.")
        except Exception as e:
            logger.warning(f"AI enrichment skipped (fallback): {e}")
            if not data_dict["summary"]:
                data_dict["summary"] = (
                    f"Hello {data_dict['name']}, you've maintained a "
                    f"{data_dict['adherence']}% consistency this week. Keep up the steady progress."
                )
            if not data_dict["insights"]:
                data_dict["insights"] = [
                    "Your routine is stabilizing.",
                    "Most doses were taken on schedule."
                ]
            if not data_dict["recommendations"]:
                data_dict["recommendations"] = [
                    "Keep your medicines visible to stay on track.",
                    "Set a recurring alarm for evening doses.",
                    "Continue monitoring your daily symptoms."
                ]

        logger.info(f"Generating PDF report for {request.name}...")
        generator = RecoveryReportGenerator(data_dict)
        pdf_bytes = generator.generate()

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    f"attachment; filename=Recovery_Report_{request.name.replace(' ', '_')}.pdf"
                )
            }
        )

    except Exception as e:
        logger.error(f"Report generation failed:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "discharge-buddy-ocr",
        "engine": "google-gemini-vision",
        "google_key_configured": bool(GOOGLE_API_KEY)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)
