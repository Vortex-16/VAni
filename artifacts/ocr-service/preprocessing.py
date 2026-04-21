"""
Image Preprocessing Pipeline for Prescription Scanning.

Applies multiple enhancement stages to maximize OCR accuracy,
especially for low-quality, handwritten, or phone-camera images.

Pipeline:
  1. Convert to grayscale
  2. Denoise (Non-local Means)
  3. CLAHE contrast enhancement
  4. Adaptive thresholding (optional — for very poor contrast)
  5. Skew correction (deskew)
  6. Border cleanup
"""

import cv2
import numpy as np
from typing import Tuple


def to_grayscale(image: np.ndarray) -> np.ndarray:
    """Convert BGR image to grayscale. No-op if already single channel."""
    if len(image.shape) == 3 and image.shape[2] == 3:
        return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return image


def denoise(image: np.ndarray, strength: int = 10) -> np.ndarray:
    """
    Apply Non-Local Means denoising.
    Works on grayscale images. `strength` controls filter intensity.
    Higher = more denoising but may lose fine handwriting detail.
    """
    if len(image.shape) == 2:
        return cv2.fastNlMeansDenoising(image, None, h=strength, templateWindowSize=7, searchWindowSize=21)
    return cv2.fastNlMeansDenoisingColored(image, None, strength, strength, 7, 21)


def apply_clahe(image: np.ndarray, clip_limit: float = 3.0, tile_size: int = 8) -> np.ndarray:
    """
    Contrast Limited Adaptive Histogram Equalization (CLAHE).
    Dramatically improves readability of faded, unevenly-lit, or low-contrast text.
    Works on grayscale input.
    """
    gray = to_grayscale(image)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile_size, tile_size))
    return clahe.apply(gray)


def adaptive_threshold(image: np.ndarray, block_size: int = 31, c: int = 10) -> np.ndarray:
    """
    Adaptive Gaussian thresholding for very poor contrast images.
    Converts text into clean black-on-white.
    Only use this when CLAHE alone doesn't help.
    """
    gray = to_grayscale(image)
    return cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                  cv2.THRESH_BINARY, block_size, c)


def detect_skew_angle(image: np.ndarray) -> float:
    """
    Detect the skew angle of text in the image using Hough lines.
    Returns angle in degrees (positive = clockwise rotation needed).
    """
    gray = to_grayscale(image)
    # Edge detection
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    # Detect lines
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=100,
                             minLineLength=gray.shape[1] // 4, maxLineGap=20)

    if lines is None or len(lines) == 0:
        return 0.0

    angles = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
        # Only consider near-horizontal lines (text lines)
        if abs(angle) < 30:
            angles.append(angle)

    if len(angles) == 0:
        return 0.0

    # Use median to be robust against outliers
    return float(np.median(angles))


def deskew(image: np.ndarray, angle: float = None) -> np.ndarray:
    """
    Correct skew in the image. If no angle provided, auto-detects.
    Uses rotation with border replication to avoid black corners.
    """
    if angle is None:
        angle = detect_skew_angle(image)

    if abs(angle) < 0.5:
        return image  # Not skewed enough to bother

    h, w = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)

    # Calculate new bounding box size to avoid clipping
    cos = np.abs(M[0, 0])
    sin = np.abs(M[0, 1])
    new_w = int(h * sin + w * cos)
    new_h = int(h * cos + w * sin)
    M[0, 2] += (new_w - w) / 2
    M[1, 2] += (new_h - h) / 2

    return cv2.warpAffine(image, M, (new_w, new_h),
                           flags=cv2.INTER_CUBIC,
                           borderMode=cv2.BORDER_REPLICATE)


def remove_borders(image: np.ndarray, margin: int = 5) -> np.ndarray:
    """Remove thin dark borders (from scanning/camera edges)."""
    gray = to_grayscale(image)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return image

    # Find the largest contour (should be the document)
    largest = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(largest)

    # Only crop if the contour is large enough (at least 50% of image)
    img_area = image.shape[0] * image.shape[1]
    if w * h > img_area * 0.5:
        return image[max(0, y - margin):y + h + margin, max(0, x - margin):x + w + margin]

    return image


def sharpen(image: np.ndarray) -> np.ndarray:
    """Light unsharp mask to enhance text edges without amplifying noise."""
    blurred = cv2.GaussianBlur(image, (0, 0), 3)
    return cv2.addWeighted(image, 1.5, blurred, -0.5, 0)


def preprocess_for_ocr(image: np.ndarray, aggressive: bool = False) -> np.ndarray:
    """
    Full preprocessing pipeline optimized for prescription OCR.
    Now includes smart upscaling for low-resolution handwritten images.
    """
    # Step 1: Smart Upscaling (Handwriting needs resolution)
    h, w = image.shape[:2]
    target_height = 2048 # High resolution for better handwriting loops
    if h < target_height:
        scale = target_height / h
        image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        # Apply light sharpening after upscale
        image = sharpen(image)

    # Step 2: Remove borders / crop to document
    processed = remove_borders(image)

    # Step 3: Denoise (before any enhancement to avoid amplifying noise)
    # Lower strength for upscaled image to preserve loops
    processed = denoise(processed, strength=5)

    # Step 4: CLAHE contrast enhancement on grayscale
    gray = apply_clahe(processed, clip_limit=4.0, tile_size=12)

    # Step 5: Sharpen text edges
    gray = sharpen(gray)

    # Step 6: Deskew
    gray = deskew(gray)

    # Step 7: If aggressive mode, apply adaptive thresholding
    if aggressive:
        gray = adaptive_threshold(gray, block_size=31, c=8)

    # Step 8: Convert back to BGR (docTR expects 3-channel)

    Args:
        image: Input BGR or grayscale image (numpy array).
        aggressive: If True, applies adaptive thresholding for very poor images.

    Returns:
        Preprocessed image ready for OCR (BGR, enhanced).
    """
    # Step 1: Remove borders / crop to document
    processed = remove_borders(image)

    # Step 2: Denoise (before any enhancement to avoid amplifying noise)
    processed = denoise(processed, strength=8)

    # Step 3: CLAHE contrast enhancement on grayscale
    gray = apply_clahe(processed, clip_limit=3.0)

    # Step 4: Sharpen text edges
    gray = sharpen(gray)

    # Step 5: Deskew
    gray = deskew(gray)

    # Step 6: If aggressive mode, apply adaptive thresholding
    if aggressive:
        gray = adaptive_threshold(gray, block_size=31, c=8)

    # Step 7: Convert back to BGR (docTR expects 3-channel)
    if len(gray.shape) == 2:
        result = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    else:
        result = gray

    return result


def preprocess_region(region: np.ndarray) -> np.ndarray:
    """
    Preprocess a specific text region crop for TrOCR refinement.
    More aggressive enhancement for individual words/lines.
    """
    if region.size == 0:
        return region

    gray = to_grayscale(region)

    # Stronger CLAHE for individual regions
    clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(4, 4))
    enhanced = clahe.apply(gray)

    # Sharpen
    enhanced = sharpen(enhanced)

    # Resize to at least 64px height for TrOCR (it works best at 384x384)
    h, w = enhanced.shape[:2]
    if h < 64:
        scale = 64 / h
        enhanced = cv2.resize(enhanced, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    # Convert to RGB for TrOCR
    return cv2.cvtColor(enhanced, cv2.COLOR_GRAY2RGB)

def preprocess_for_tesseract(image: np.ndarray) -> np.ndarray:
    """
    Highly aggressive preprocessing specifically tuned for Tesseract OCR.
    Tesseract performs poorly on noisy/low-contrast images compared to docTR.
    """
    # 1. Grayscale
    gray = to_grayscale(image)
    
    # 2. Resize to 300 DPI equivalent (approx 2x for standard phone photos)
    h, w = gray.shape[:2]
    if h < 2000:
        scale = 2000 / h
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        
    # 3. Denoise
    gray = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)
    
    # 4. Aggressive Contrast (CLAHE)
    clahe = cv2.createCLAHE(clipLimit=5.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)
    
    # 5. Adaptive Thresholding (Binarization - critical for Tesseract)
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15
    )
    
    return binary
