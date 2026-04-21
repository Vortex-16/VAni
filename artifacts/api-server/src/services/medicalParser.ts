/**
 * Medical Parser — Rule-based prescription abbreviation parser.
 *
 * Handles common medical abbreviations and dosage patterns:
 *   - Frequency: OD, BD, TDS, QID, SOS, HS, PRN, STAT
 *   - Timing: AC, PC, HS, AM, PM
 *   - Dosage patterns: 1-0-1, 1-1-1, 0-0-1, etc.
 *   - Duration: "x 5 days", "for 1 week", etc.
 *
 * Returns structured schedule data for each medicine detected.
 */

export interface ParsedSchedule {
  morning: boolean;
  afternoon: boolean;
  night: boolean;
}

export interface ParsedMedicine {
  name: string;
  dosage: string;
  frequency: string;           // Human-readable: "twice daily"
  frequency_code: string;      // Original abbreviation: "BD"
  duration: string;
  timing: string;              // "before food", "after food", etc.
  schedule: ParsedSchedule;
  notes: string;
  confidence: number;          // From OCR (0-100 scale)
  low_confidence: boolean;     // True if any component had low OCR confidence
}

// ─── Frequency Abbreviation Map ───

const FREQUENCY_MAP: Record<string, { label: string; schedule: ParsedSchedule }> = {
  "OD":    { label: "once daily",       schedule: { morning: true,  afternoon: false, night: false } },
  "QD":    { label: "once daily",       schedule: { morning: true,  afternoon: false, night: false } },
  "BD":    { label: "twice daily",      schedule: { morning: true,  afternoon: false, night: true  } },
  "BID":   { label: "twice daily",      schedule: { morning: true,  afternoon: false, night: true  } },
  "TDS":   { label: "three times daily", schedule: { morning: true, afternoon: true,  night: true  } },
  "TID":   { label: "three times daily", schedule: { morning: true, afternoon: true,  night: true  } },
  "QID":   { label: "four times daily", schedule: { morning: true,  afternoon: true,  night: true  } },
  "SOS":   { label: "as needed (SOS)",  schedule: { morning: false, afternoon: false, night: false } },
  "PRN":   { label: "as needed",        schedule: { morning: false, afternoon: false, night: false } },
  "HS":    { label: "at bedtime",       schedule: { morning: false, afternoon: false, night: true  } },
  "STAT":  { label: "immediately",      schedule: { morning: true,  afternoon: false, night: false } },
  "QOD":   { label: "every other day",  schedule: { morning: true,  afternoon: false, night: false } },
  "Q4H":   { label: "every 4 hours",    schedule: { morning: true,  afternoon: true,  night: true  } },
  "Q6H":   { label: "every 6 hours",    schedule: { morning: true,  afternoon: true,  night: true  } },
  "Q8H":   { label: "every 8 hours",    schedule: { morning: true,  afternoon: false, night: true  } },
  "Q12H":  { label: "every 12 hours",   schedule: { morning: true,  afternoon: false, night: true  } },
  "ONCE DAILY":     { label: "once daily",       schedule: { morning: true,  afternoon: false, night: false } },
  "TWICE DAILY":    { label: "twice daily",      schedule: { morning: true,  afternoon: false, night: true  } },
  "THRICE DAILY":   { label: "three times daily", schedule: { morning: true, afternoon: true,  night: true  } },
};

// ─── Timing Abbreviation Map ───

const TIMING_MAP: Record<string, string> = {
  "AC":   "before food",
  "PC":   "after food",
  "CC":   "with food",
  "AM":   "in the morning",
  "PM":   "in the evening",
  "HS":   "at bedtime",
  "EMPTY STOMACH": "on empty stomach",
  "WITH FOOD":     "with food",
  "BEFORE FOOD":   "before food",
  "AFTER FOOD":    "after food",
  "BEFORE MEALS":  "before meals",
  "AFTER MEALS":   "after meals",
};

// ─── Dosage Pattern: 1-0-1 style ───

const DOSE_PATTERN_REGEX = /^([01])\s*[-–]\s*([01])\s*[-–]\s*([01])$/;

/**
 * Parse a "1-0-1" style dosage pattern into a schedule.
 */
function parseDosePattern(pattern: string): ParsedSchedule | null {
  const match = pattern.trim().match(DOSE_PATTERN_REGEX);
  if (!match) return null;

  return {
    morning:   match[1] === "1",
    afternoon: match[2] === "1",
    night:     match[3] === "1",
  };
}

/**
 * Convert a "1-0-1" pattern to human-readable frequency.
 */
function dosePatternToFrequency(pattern: string): string {
  const schedule = parseDosePattern(pattern);
  if (!schedule) return pattern;

  const parts: string[] = [];
  if (schedule.morning) parts.push("morning");
  if (schedule.afternoon) parts.push("afternoon");
  if (schedule.night) parts.push("night");

  if (parts.length === 0) return "as needed";
  if (parts.length === 3) return "three times daily (morning, afternoon, night)";
  if (parts.length === 2) return `twice daily (${parts.join(" and ")})`;
  return `once daily (${parts[0]})`;
}

// ─── Duration Extraction ───

const DURATION_PATTERNS = [
  /(\d+)\s*days?/i,
  /(\d+)\s*weeks?/i,
  /(\d+)\s*months?/i,
  /x\s*(\d+)\s*d/i,      // "x 5 d" or "x5d"
  /for\s*(\d+)\s*d/i,
];

function extractDuration(text: string): string {
  for (const pattern of DURATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  return "";
}

// ─── Dosage Extraction ───

const DOSAGE_PATTERNS = [
  /\d+\.?\d*\s*(?:mg|mcg|g|ml|IU|units?|tab(?:let)?s?|cap(?:sule)?s?|drops?|puffs?)/i,
  /\d+\s*\/\s*\d+/i,  // e.g., "500/125"
];

function extractDosage(text: string): string {
  for (const pattern of DOSAGE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  return "";
}

// ─── Frequency Matching ───

/**
 * Try to find a frequency abbreviation in a text string.
 */
function matchFrequency(text: string): { label: string; code: string; schedule: ParsedSchedule } | null {
  const upper = text.toUpperCase().trim();

  // First, check for 1-0-1 style patterns
  const doseSchedule = parseDosePattern(upper);
  if (doseSchedule) {
    return {
      label: dosePatternToFrequency(upper),
      code: upper,
      schedule: doseSchedule,
    };
  }

  // Then check abbreviation map (longest match first)
  const sortedKeys = Object.keys(FREQUENCY_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    // Use word boundary matching
    const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "i");
    if (regex.test(upper)) {
      const entry = FREQUENCY_MAP[key]!;
      return {
        label: entry.label,
        code: key,
        schedule: entry.schedule,
      };
    }
  }

  return null;
}

/**
 * Try to find a timing instruction in text.
 */
function matchTiming(text: string): string {
  const upper = text.toUpperCase().trim();

  const sortedKeys = Object.keys(TIMING_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (upper.includes(key)) {
      return TIMING_MAP[key]!;
    }
  }

  return "";
}

/**
 * Parse raw OCR text to extract medical information.
 *
 * This is a rule-based supplementary parser. The primary parsing is done
 * by Gemini AI, but this catches abbreviations that Gemini might miss
 * and provides fallback data.
 *
 * @param rawText - Full OCR text from the prescription
 * @param lineConfidences - Optional confidence per line from OCR
 * @returns Array of parsed medicine entries
 */
export function parseRawPrescriptionText(
  rawText: string,
  lineConfidences?: { text: string; confidence: number }[]
): { parsedFrequencies: Record<string, { label: string; code: string; schedule: ParsedSchedule }>; parsedTimings: Record<string, string>; parsedDurations: Record<string, string> } {
  const parsedFrequencies: Record<string, { label: string; code: string; schedule: ParsedSchedule }> = {};
  const parsedTimings: Record<string, string> = {};
  const parsedDurations: Record<string, string> = {};

  const lines = rawText.split("\n").filter(l => l.trim().length > 0);

  for (const line of lines) {
    const freq = matchFrequency(line);
    if (freq) {
      parsedFrequencies[line] = freq;
    }

    const timing = matchTiming(line);
    if (timing) {
      parsedTimings[line] = timing;
    }

    const duration = extractDuration(line);
    if (duration) {
      parsedDurations[line] = duration;
    }
  }

  return { parsedFrequencies, parsedTimings, parsedDurations };
}

/**
 * Enrich Gemini-parsed medicines with rule-based schedule data.
 *
 * Takes Gemini's structured output and adds/corrects:
 * - Schedule (morning/afternoon/night) from frequency codes
 * - Timing from abbreviations
 * - Duration if found in text
 */
export function enrichWithRuleParsing(
  medicines: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    timing: string;
    notes: string;
    confidence: number;
  }>
): ParsedMedicine[] {
  return medicines.map(med => {
    // Try to match frequency
    const freq = matchFrequency(med.frequency) || matchFrequency(med.notes);

    // Determine schedule
    let schedule: ParsedSchedule;
    if (freq) {
      schedule = freq.schedule;
    } else {
      // Default: check frequency text for hints
      const lower = med.frequency.toLowerCase();
      schedule = {
        morning: lower.includes("morning") || lower.includes("once") || lower.includes("daily"),
        afternoon: lower.includes("afternoon") || lower.includes("three") || lower.includes("thrice"),
        night: lower.includes("night") || lower.includes("bedtime") || lower.includes("twice") || lower.includes("three"),
      };
    }

    // Try to match timing
    const timing = matchTiming(med.timing) || matchTiming(med.notes) || med.timing;

    return {
      name: med.name,
      dosage: med.dosage,
      frequency: freq?.label || med.frequency,
      frequency_code: freq?.code || "",
      duration: med.duration || "",
      timing,
      schedule,
      notes: med.notes,
      confidence: med.confidence,
      low_confidence: med.confidence < 70,
    };
  });
}
