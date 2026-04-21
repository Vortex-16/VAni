"""
OCR Engine — docTR + TrOCR Hybrid for Maximum Accuracy.

Architecture:
  1. docTR runs full-page OCR with word-level bounding boxes + confidence
  2. Words below confidence threshold are sent to TrOCR for refinement
  3. Results are merged, keeping the highest-confidence version of each word
  4. Final output includes per-word and per-line confidence scores

docTR handles both printed and handwritten text natively.
TrOCR (microsoft/trocr-large-handwritten) specializes in difficult handwriting.
"""

import logging
import numpy as np
from typing import List, Optional, Tuple
from dataclasses import dataclass, field
from PIL import Image

logger = logging.getLogger(__name__)

# Lazy-loaded models (initialized on first use)
_doctr_model = None
_trocr_processor = None
_trocr_model = None

# Confidence threshold: words below this are sent to TrOCR for refinement
# Increased to 0.75 to be more aggressive with handwriting models
TROCR_REFINEMENT_THRESHOLD = 0.75
TROCR_REFINEMENT_THRESHOLD = 0.65


@dataclass
class WordResult:
    """A single recognized word with position and confidence."""
    text: str
    confidence: float           # 0.0 to 1.0
    bbox: Tuple[float, float, float, float]  # (x_min, y_min, x_max, y_max) normalized 0-1
    source: str = "doctr"       # "doctr" or "trocr"
    refined: bool = False       # True if TrOCR improved on docTR result


@dataclass
class LineResult:
    """A line of text composed of words."""
    text: str
    confidence: float           # Average confidence of all words
    words: List[WordResult]
    bbox: Tuple[float, float, float, float]
    low_confidence: bool = False  # True if any word < 0.7


@dataclass
class OCRResult:
    """Full OCR output from the engine."""
    lines: List[LineResult]
    full_text: str
    overall_confidence: float    # Weighted average across all words
    word_count: int
    low_confidence_words: int    # Count of words below threshold
    ocr_source: str = "doctr+trocr"


def _load_doctr():
    """Lazy-load the docTR model."""
    global _doctr_model
    if _doctr_model is None:
        logger.info("Loading docTR model (first time — this may take a moment)...")
        from doctr.models import ocr_predictor
        _doctr_model = ocr_predictor(
            det_arch="db_resnet50",       # Detection: best accuracy
            reco_arch="crnn_vgg16_bn",    # Recognition: good for mixed print+handwriting
            pretrained=True,
            assume_straight_pages=False,   # Handle rotated/skewed pages
            straighten_pages=True,         # Auto-straighten
            detect_orientation=True,       # Auto-detect page orientation
        )
        logger.info("docTR model loaded successfully.")
    return _doctr_model


def _load_trocr():
    """Lazy-load the TrOCR model for handwriting refinement."""
    global _trocr_processor, _trocr_model
    if _trocr_processor is None:
        logger.info("Loading TrOCR model for handwriting refinement...")
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel

        model_name = "microsoft/trocr-base-handwritten"
        _trocr_processor = TrOCRProcessor.from_pretrained(model_name)
        _trocr_model = VisionEncoderDecoderModel.from_pretrained(model_name)
        logger.info("TrOCR model loaded successfully.")
    return _trocr_processor, _trocr_model


def _trocr_recognize(image: np.ndarray, bbox: Tuple[float, float, float, float]) -> Tuple[str, float]:
    """
    Run TrOCR on a specific region of the image.

    Args:
        image: Full BGR image (numpy array).
        bbox: Normalized bounding box (x_min, y_min, x_max, y_max) in 0-1 range.

    Returns:
        (recognized_text, confidence) tuple.
    """
    import torch
    from preprocessing import preprocess_region

    processor, model = _load_trocr()

    h, w = image.shape[:2]
    x1 = int(bbox[0] * w)
    y1 = int(bbox[1] * h)
    x2 = int(bbox[2] * w)
    y2 = int(bbox[3] * h)

    # Pad the crop slightly for context
    pad = 5
    x1 = max(0, x1 - pad)
    y1 = max(0, y1 - pad)
    x2 = min(w, x2 + pad)
    y2 = min(h, y2 + pad)

    crop = image[y1:y2, x1:x2]
    if crop.size == 0:
        return "", 0.0

    # Preprocess the region for TrOCR
    processed = preprocess_region(crop)
    pil_image = Image.fromarray(processed)

    # Run TrOCR
    pixel_values = processor(images=pil_image, return_tensors="pt").pixel_values

    with torch.no_grad():
        outputs = model.generate(
            pixel_values,
            max_new_tokens=64,
            return_dict_in_generate=True,
            output_scores=True,
        )

    # Decode text
    text = processor.batch_decode(outputs.sequences, skip_special_tokens=True)[0].strip()

    # Estimate confidence from generation scores
    if outputs.scores:
        import torch.nn.functional as F
        probs = [F.softmax(score, dim=-1).max().item() for score in outputs.scores]
        confidence = float(np.mean(probs)) if probs else 0.5
    else:
        confidence = 0.5

    return text, confidence


def run_ocr(image: np.ndarray, refine_with_trocr: bool = True) -> OCRResult:
    """
    Run the full OCR pipeline on a preprocessed image.

    Args:
        image: BGR numpy array (already preprocessed).
        refine_with_trocr: If True, use TrOCR to refine low-confidence words.

    Returns:
        OCRResult with lines, words, confidence scores.
    """
    try:
        from doctr.io import DocumentFile

        model = _load_doctr()

        # docTR expects a list of numpy arrays or a DocumentFile
        # Convert BGR to RGB for docTR
        if len(image.shape) == 3 and image.shape[2] == 3:
            rgb_image = image[:, :, ::-1]  # BGR to RGB
        else:
            rgb_image = image

        # Run docTR
        logger.info("Running docTR text detection and recognition...")
        result = model([rgb_image])

        all_lines: List[LineResult] = []
        all_words_flat: List[WordResult] = []
        low_conf_count = 0

        # Process each page (we only have one)
        for page in result.pages:
            for block in page.blocks:
                for line in block.lines:
                    line_words: List[WordResult] = []

                    for word in line.words:
                        bbox = (
                            float(word.geometry[0][0]),  # x_min
                            float(word.geometry[0][1]),  # y_min
                            float(word.geometry[1][0]),  # x_max
                            float(word.geometry[1][1]),  # y_max
                        )

                        word_result = WordResult(
                            text=word.value,
                            confidence=float(word.confidence),
                            bbox=bbox,
                            source="doctr",
                        )

                        # TrOCR refinement for low-confidence words
                        if refine_with_trocr and word_result.confidence < TROCR_REFINEMENT_THRESHOLD:
                            try:
                                trocr_text, trocr_conf = _trocr_recognize(image, bbox)
                                if trocr_text and trocr_conf > word_result.confidence:
                                    logger.debug(
                                        f"TrOCR improved: '{word_result.text}' ({word_result.confidence:.2f}) "
                                        f"→ '{trocr_text}' ({trocr_conf:.2f})"
                                    )
                                    word_result.text = trocr_text
                                    word_result.confidence = trocr_conf
                                    word_result.source = "trocr"
                                    word_result.refined = True
                            except Exception as e:
                                logger.warning(f"TrOCR refinement failed for word '{word.value}': {e}")

                        if word_result.confidence < 0.7:
                            low_conf_count += 1

                        line_words.append(word_result)
                        all_words_flat.append(word_result)

                    if line_words:
                        line_text = " ".join(w.text for w in line_words)
                        line_conf = float(np.mean([w.confidence for w in line_words]))
                        line_bbox = (
                            min(w.bbox[0] for w in line_words),
                            min(w.bbox[1] for w in line_words),
                            max(w.bbox[2] for w in line_words),
                            max(w.bbox[3] for w in line_words),
                        )

                        all_lines.append(LineResult(
                            text=line_text,
                            confidence=line_conf,
                            words=line_words,
                            bbox=line_bbox,
                            low_confidence=any(w.confidence < 0.7 for w in line_words),
                        ))

        # Overall stats for docTR
        doctr_text = "\n".join(line.text for line in all_lines)
        overall_confidence = float(np.mean([w.confidence for w in all_words_flat])) if all_words_flat else 0.0

        # --- Tesseract Secondary Pass ---
        logger.info("Running Tesseract secondary pass...")
        tesseract_text = ""
        try:
            import pytesseract
            import cv2
            from preprocessing import preprocess_for_tesseract
            
            # Use the new aggressive preprocessing specifically for Tesseract
            tess_image = preprocess_for_tesseract(image)
            tesseract_text = pytesseract.image_to_string(tess_image).strip()
            logger.info("Tesseract pass completed.")
        except Exception as tess_err:
            logger.warning(f"Tesseract pass failed, continuing with docTR only: {tess_err}")
            tesseract_text = "[Tesseract failed or unavailable]"

        # Combine both outputs for the AI
        full_text = f"--- docTR Output ---\n{doctr_text}\n\n--- Tesseract Output ---\n{tesseract_text}"

        # Overall stats
        full_text = "\n".join(line.text for line in all_lines)
        overall_confidence = float(np.mean([w.confidence for w in all_words_flat])) if all_words_flat else 0.0

        logger.info(
            f"OCR complete: {len(all_words_flat)} words, {len(all_lines)} lines, "
            f"avg confidence: {overall_confidence:.2f}, low-conf words: {low_conf_count}"
        )

        return OCRResult(
            lines=all_lines,
            full_text=full_text,
            overall_confidence=round(overall_confidence, 3),
            word_count=len(all_words_flat),
            low_confidence_words=low_conf_count,
            ocr_source="doctr+trocr" if refine_with_trocr else "doctr",
        )
    
    except Exception as e:
        logger.error(f"DocTR pipeline failed: {str(e)}. Attempting Tesseract fallback...")
        try:
            import pytesseract
            import cv2
            
            # Note: For Tesseract on Windows, the executable must be in PATH or configured via pytesseract.pytesseract.tesseract_cmd
            
            if len(image.shape) == 3 and image.shape[2] == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image
                
            text = pytesseract.image_to_string(gray)
            words = text.split()
            
            logger.info("Tesseract fallback completed.")
            
            return OCRResult(
                lines=[LineResult(text=text, confidence=0.5, words=[], bbox=(0,0,1,1), low_confidence=True)],
                full_text=text,
                overall_confidence=0.5,
                word_count=len(words),
                low_confidence_words=len(words),
                ocr_source="tesseract_fallback"
            )
        except Exception as tesseract_err:
            logger.error(f"Tesseract fallback also failed: {str(tesseract_err)}")
            # Raise the original error so main.py's graceful fallback catches it
            raise e
