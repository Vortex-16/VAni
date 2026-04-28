import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import traceback
import io
import os
import json
from fastapi.responses import Response

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 📝 1. FASTAPI SETUP
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(__file__), "../../.env")
logger.info(f"Loading .env from: {os.path.abspath(env_path)}")
load_dotenv(env_path) 
logger.info(f"GOOGLE_API_KEY found: {'Yes' if os.getenv('GOOGLE_API_KEY') else 'No'}")

app = FastAPI(title="D-Buddy OCR & Report Service")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 📊 2. DATA MODELS
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
    # These will be enriched by AI if not provided
    insights: List[str] = []
    summary: str = ""
    recommendations: List[str] = []

# 🧠 3. AI ANALYSIS LAYER (Gemini)
async def analyze_patient_data(data: dict):
    """
    Use Gemini to generate personalized, supportive recovery insights.
    """
    try:
        import google.generativeai as genai
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            logger.warning("No GOOGLE_API_KEY found. Using fallback logic.")
            return None

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-flash-latest')

        prompt = f"""
        You are a healthcare AI assistant generating a personalized recovery report.
        
        Analyze this patient's data:
        - Name: {data['name']}
        - Adherence: {data['adherence']}%
        - Doses: {data['taken']} taken / {data['total']} total ({data['missed']} missed)
        - Medications: {', '.join([m['name'] for m in data['medications']])}
        
        TASK:
        1. Write a personalized summary (2–3 lines). Use the patient's name. Tone: calm, supportive, human.
        2. Generate 2-3 behavioral insights (patterns, consistency).
        3. Generate 2-3 practical, actionable recommendations (no medical advice).
        
        Tone: Encouraging, non-judgmental, natural (not robotic).
        
        FORMAT YOUR RESPONSE AS JSON:
        {{
            "summary": "...",
            "insights": ["...", "..."],
            "recommendations": ["...", "..."]
        }}
        """
        
        response = model.generate_content(prompt)
        # Handle potential markdown formatting in response
        clean_json = response.text.strip().replace('```json', '').replace('```', '')
        return json.loads(clean_json)
    except Exception as e:
        logger.error(f"AI Analysis failed: {e}")
        return None

# 🚀 4. ENDPOINTS

@app.post("/generate-report")
async def generate_report(request: ReportRequest):
    """
    Generate a premium, AI-enriched PDF recovery report.
    """
    try:
        from report_generator import RecoveryReportGenerator
        
        data_dict = request.dict()
        
        # 🧠 Enrich with AI if possible
        ai_analysis = await analyze_patient_data(data_dict)
        if ai_analysis:
            data_dict['summary'] = ai_analysis.get('summary', data_dict['summary'])
            data_dict['insights'] = ai_analysis.get('insights', data_dict['insights'])
            data_dict['recommendations'] = ai_analysis.get('recommendations', data_dict['recommendations'])
        else:
            # Fallback if AI fails
            if not data_dict['summary']:
                data_dict['summary'] = f"Hello {data_dict['name']}, you've maintained a {data_dict['adherence']}% consistency this week. Keep up the steady progress."
            if not data_dict['insights']:
                data_dict['insights'] = ["Your routine is stabilizing.", "Most doses were taken on schedule."]
            if not data_dict['recommendations']:
                data_dict['recommendations'] = ["Keep your meds visible to stay on track.", "Set a recurring alarm for evening doses."]

        logger.info(f"Generating Medical Report for {request.name}...")
        generator = RecoveryReportGenerator(data_dict)
        pdf_bytes = generator.generate()
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=Recovery_Report_{request.name.replace(' ', '_')}.pdf"
            }
        )
    except Exception as e:
        logger.error(f"Report generation failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze_prescription(request: Request):
    """
    Process a prescription image: Preprocess -> OCR -> AI Entity Extraction.
    """
    try:
        import cv2
        import numpy as np
        import base64
        from preprocessing import preprocess_for_ocr
        from ocr_engine import run_ocr
        
        # 1. Parse Input
        body = await request.json()
        image_b64 = body.get("image")
        logger.info(f"Received image_b64 type: {type(image_b64)}")
        if not image_b64:
            raise HTTPException(status_code=400, detail="No image data provided")

        # 2. Decode Image
        try:
            # Handle potential data URI prefix
            if "," in image_b64:
                image_b64 = image_b64.split(",")[1]
            
            img_bytes = base64.b64decode(image_b64)
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                raise ValueError("Failed to decode image")
        except Exception as decode_err:
            logger.error(f"Image decoding failed: {decode_err}")
            raise HTTPException(status_code=400, detail="Invalid image format or corrupted data")

        # 3. Preprocess
        logger.info("Preprocessing image...")
        processed_img = preprocess_for_ocr(img)

        # 4. Run OCR Pipeline (docTR + TrOCR)
        logger.info("Running OCR engine...")
        ocr_result = run_ocr(processed_img)

        # 5. AI Entity Extraction (Gemini)
        logger.info("Extracting medical entities via AI...")
        entities = await extract_medications_from_text(ocr_result.full_text)

        # 6. Final Result
        return {
            "success": True,
            "ocr": {
                "full_text": ocr_result.full_text,
                "confidence": ocr_result.overall_confidence,
                "word_count": ocr_result.word_count,
                "source": ocr_result.ocr_source
            },
            "entities": entities,
            "metadata": {
                "low_confidence_words": ocr_result.low_confidence_words
            }
        }

    except Exception as e:
        logger.error(f"Analysis failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

async def extract_medications_from_text(text: str):
    """
    Use Gemini to parse raw OCR text into structured medication data.
    """
    try:
        import google.generativeai as genai
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            logger.warning("GOOGLE_API_KEY not set. Returning raw text only.")
            return {"medications": [], "parsing_error": "API key missing"}

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-flash-latest')

        prompt = f"""
        You are a medical data extraction expert. 
        Below is raw OCR text from a doctor's prescription or discharge summary.
        
        TASK:
        1. Extract all medications listed.
        2. For each medication, find: Name, Dosage (e.g. 500mg), Frequency (e.g. BD, TID, Once Daily), and Duration.
        3. Translate medical shorthand (BD -> Twice Daily, OD -> Once Daily, TDS -> Thrice Daily, HS -> At Night).
        4. If the text is messy, use your medical knowledge to infer the correct medicine name.
        
        RAW TEXT:
        {text}
        
        FORMAT YOUR RESPONSE AS A VALID JSON ARRAY OF OBJECTS:
        [
            {{"name": "...", "dosage": "...", "frequency": "...", "duration": "...", "instructions": "..."}},
            ...
        ]
        
        Only return the JSON array. No preamble.
        """
        
        response = model.generate_content(prompt)
        # Clean up potential markdown formatting
        clean_json = response.text.strip().replace('```json', '').replace('```', '')
        return json.loads(clean_json)
    except Exception as e:
        logger.error(f"AI Extraction failed: {e}")
        return {"medications": [], "error": str(e)}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ocr-report-service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)
