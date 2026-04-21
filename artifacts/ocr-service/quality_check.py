"""
Image Quality Assessment for Prescription Scanning.

Analyzes an input image and provides:
  - Quality scores (blur, lighting, contrast, resolution, skew)
  - Pass/fail verdict for OCR readiness
  - Human-readable guidance for the user (e.g., "Hold your hand steady")

This runs BEFORE OCR to avoid wasting compute on unusable images.
"""

import cv2
import numpy as np
from typing import List
from pydantic import BaseModel


class QualityIssue(BaseModel):
    """A single quality problem detected in the image."""
    code: str               # machine-readable: "blur", "dark", "low_res", "skew", "low_contrast"
    severity: str            # "error" (unusable) or "warning" (degraded but usable)
    message: str             # user-facing guidance
    score: float             # 0.0 (worst) to 1.0 (perfect)


class QualityReport(BaseModel):
    """Full quality assessment of an image."""
    is_usable: bool                   # True if OCR should proceed
    overall_score: float              # 0.0 to 1.0
    issues: List[QualityIssue]        # All detected problems
    guidance: str                     # Primary user-facing message
    needs_preprocessing: bool         # Whether aggressive preprocessing is needed
    details: dict                     # Raw metrics for debugging


# ─── Thresholds ───────────────────────────────────────────────────────

BLUR_THRESHOLD_ERROR = 30.0          # Laplacian variance below this = unusable
BLUR_THRESHOLD_WARN = 80.0           # Below this = degraded quality

BRIGHTNESS_LOW_ERROR = 40            # Mean brightness below this = too dark to use
BRIGHTNESS_LOW_WARN = 70             # Below this = somewhat dark
BRIGHTNESS_HIGH_WARN = 220           # Above this = washed out / overexposed
BRIGHTNESS_HIGH_ERROR = 240          # Above this = unusable overexposure

CONTRAST_THRESHOLD_ERROR = 20.0      # Std dev below this = no distinguishable text
CONTRAST_THRESHOLD_WARN = 40.0       # Below this = poor contrast

MIN_RESOLUTION_ERROR = 200           # Min dimension below this = unusable
MIN_RESOLUTION_WARN = 480            # Below this = may lose detail

SKEW_THRESHOLD_WARN = 5.0            # Degrees of skew before warning
SKEW_THRESHOLD_ERROR = 15.0          # Degrees of skew that seriously degrades OCR


def measure_blur(gray: np.ndarray) -> float:
    """
    Measure image sharpness using Laplacian variance.
    Higher = sharper. Below 30 is very blurry, above 100 is sharp.
    """
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def measure_brightness(gray: np.ndarray) -> float:
    """Mean pixel intensity. 0 = black, 255 = white."""
    return float(np.mean(gray))


def measure_contrast(gray: np.ndarray) -> float:
    """Standard deviation of pixel intensities. Higher = more contrast."""
    return float(np.std(gray))


def measure_skew(gray: np.ndarray) -> float:
    """
    Estimate text skew angle using Hough transform.
    Returns absolute angle in degrees.
    """
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=80,
                             minLineLength=gray.shape[1] // 5, maxLineGap=15)

    if lines is None or len(lines) == 0:
        return 0.0

    angles = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
        if abs(angle) < 45:  # Only near-horizontal
            angles.append(angle)

    if not angles:
        return 0.0

    return abs(float(np.median(angles)))


def measure_text_density(gray: np.ndarray) -> float:
    """
    Rough estimate of how much text content exists in the image.
    Uses edge density as a proxy. Returns 0.0–1.0.
    """
    edges = cv2.Canny(gray, 100, 200)
    return float(np.sum(edges > 0) / edges.size)


def assess_quality(image: np.ndarray) -> QualityReport:
    """
    Run full quality assessment on an image.

    Args:
        image: BGR or grayscale numpy array.

    Returns:
        QualityReport with scores, issues, and user guidance.
    """
    # Convert to grayscale for analysis
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()

    h, w = gray.shape[:2]
    min_dim = min(h, w)

    # ─── Measure all metrics ───
    blur_score = measure_blur(gray)
    brightness = measure_brightness(gray)
    contrast = measure_contrast(gray)
    skew_angle = measure_skew(gray)
    text_density = measure_text_density(gray)

    issues: List[QualityIssue] = []
    needs_aggressive = False

    # ─── Blur check ───
    if blur_score < BLUR_THRESHOLD_ERROR:
        issues.append(QualityIssue(
            code="blur",
            severity="error",
            message="📸 Image is very blurry. Hold your phone steady and tap to focus before capturing.",
            score=max(0, blur_score / BLUR_THRESHOLD_WARN)
        ))
    elif blur_score < BLUR_THRESHOLD_WARN:
        issues.append(QualityIssue(
            code="blur",
            severity="warning",
            message="📸 Image is slightly blurry. Try holding your phone more steady for better results.",
            score=blur_score / BLUR_THRESHOLD_WARN
        ))

    # ─── Brightness check ───
    if brightness < BRIGHTNESS_LOW_ERROR:
        issues.append(QualityIssue(
            code="dark",
            severity="error",
            message="🔦 Image is too dark to read. Move to a well-lit area or turn on the flash.",
            score=max(0, brightness / BRIGHTNESS_LOW_WARN)
        ))
        needs_aggressive = True
    elif brightness < BRIGHTNESS_LOW_WARN:
        issues.append(QualityIssue(
            code="dark",
            severity="warning",
            message="🔦 Image is a bit dark. Better lighting will improve accuracy.",
            score=brightness / BRIGHTNESS_LOW_WARN
        ))
        needs_aggressive = True
    elif brightness > BRIGHTNESS_HIGH_ERROR:
        issues.append(QualityIssue(
            code="overexposed",
            severity="error",
            message="☀️ Image is overexposed (too bright). Avoid direct sunlight or glare on the paper.",
            score=max(0, (255 - brightness) / (255 - BRIGHTNESS_HIGH_WARN))
        ))
    elif brightness > BRIGHTNESS_HIGH_WARN:
        issues.append(QualityIssue(
            code="overexposed",
            severity="warning",
            message="☀️ Image is a bit bright. Reducing glare will help accuracy.",
            score=(255 - brightness) / (255 - BRIGHTNESS_HIGH_WARN)
        ))

    # ─── Contrast check ───
    if contrast < CONTRAST_THRESHOLD_ERROR:
        issues.append(QualityIssue(
            code="low_contrast",
            severity="error",
            message="🔍 Text is barely visible. Make sure the prescription text is dark on a light background.",
            score=max(0, contrast / CONTRAST_THRESHOLD_WARN)
        ))
        needs_aggressive = True
    elif contrast < CONTRAST_THRESHOLD_WARN:
        issues.append(QualityIssue(
            code="low_contrast",
            severity="warning",
            message="🔍 Low contrast detected. A clearer image will improve text recognition.",
            score=contrast / CONTRAST_THRESHOLD_WARN
        ))
        needs_aggressive = True

    # ─── Resolution check ───
    if min_dim < MIN_RESOLUTION_ERROR:
        issues.append(QualityIssue(
            code="low_resolution",
            severity="error",
            message="📏 Image resolution is too low. Move your phone closer to the prescription.",
            score=max(0, min_dim / MIN_RESOLUTION_WARN)
        ))
    elif min_dim < MIN_RESOLUTION_WARN:
        issues.append(QualityIssue(
            code="low_resolution",
            severity="warning",
            message="📏 Image could be higher resolution. Moving closer may help capture small text.",
            score=min_dim / MIN_RESOLUTION_WARN
        ))

    # ─── Skew check ───
    if skew_angle > SKEW_THRESHOLD_ERROR:
        issues.append(QualityIssue(
            code="skew",
            severity="warning",
            message="📐 Prescription is tilted significantly. Try to align it more horizontally.",
            score=max(0, 1 - (skew_angle - SKEW_THRESHOLD_WARN) / (SKEW_THRESHOLD_ERROR - SKEW_THRESHOLD_WARN))
        ))
    elif skew_angle > SKEW_THRESHOLD_WARN:
        issues.append(QualityIssue(
            code="skew",
            severity="warning",
            message="📐 Prescription is slightly tilted. It will be auto-corrected, but straight alignment helps.",
            score=max(0, 1 - skew_angle / SKEW_THRESHOLD_ERROR)
        ))

    # ─── Text density check ───
    if text_density < 0.01:
        issues.append(QualityIssue(
            code="no_text",
            severity="warning",
            message="📝 Very little text detected. Make sure the prescription is fully visible in the frame.",
            score=min(1.0, text_density / 0.01)
        ))

    # ─── Compute overall score ───
    error_count = sum(1 for i in issues if i.severity == "error")
    warning_count = sum(1 for i in issues if i.severity == "warning")

    is_usable = error_count == 0

    # Overall score: start at 1.0, deduct for issues
    overall = 1.0
    for issue in issues:
        if issue.severity == "error":
            overall -= 0.3
        else:
            overall -= 0.1
    overall = max(0.0, min(1.0, overall))

    # ─── Primary guidance message ───
    if not is_usable:
        error_msgs = [i.message for i in issues if i.severity == "error"]
        guidance = error_msgs[0] if error_msgs else "Image quality is too poor for accurate scanning."
    elif warning_count > 0:
        warn_msgs = [i.message for i in issues if i.severity == "warning"]
        guidance = warn_msgs[0] + " Proceeding with best effort."
    else:
        guidance = "✅ Image quality looks good! Processing..."

    return QualityReport(
        is_usable=is_usable,
        overall_score=round(overall, 2),
        issues=issues,
        guidance=guidance,
        needs_preprocessing=needs_aggressive,
        details={
            "blur_score": round(blur_score, 2),
            "brightness": round(brightness, 2),
            "contrast": round(contrast, 2),
            "skew_angle": round(skew_angle, 2),
            "text_density": round(text_density, 4),
            "resolution": f"{w}x{h}",
            "min_dimension": min_dim,
        }
    )
