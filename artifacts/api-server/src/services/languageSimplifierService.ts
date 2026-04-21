import { db, medicalTermsDictionary } from "@workspace/db";
import { eq } from "drizzle-orm";

export type SimplifiedResult = {
  original: string;
  simplified: string;
  replacements: { term: string; meaning: string }[];
  aiUnavailable?: boolean;
};

/**
 * Language simplification service.
 * Converts medical instructions into simple language using a dictionary
 * and optionally an AI model (Anthropic Claude) for full text simplification.
 */
export class LanguageSimplifierService {
  /**
   * Look up a medical abbreviation in the dictionary.
   */
  static async lookupAbbreviation(term: string): Promise<string | null> {
    const upperTerm = term.toUpperCase();
    const [result] = await db.select()
      .from(medicalTermsDictionary)
      .where(eq(medicalTermsDictionary.abbreviation, upperTerm));

    return result ? result.simpleMeaning : null;
  }

  /**
   * Use Anthropic Claude API to simplify medical text.
   * Throws if API key is not configured or request fails.
   */
  static async simplifyWithAI(text: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your_anthropic_api_key_here") {
      throw new Error("Anthropic API key is not configured");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1024,
        system: "You are a medical language simplifier for patients. Convert the given medical instruction into simple, clear English that a non-medical person can understand. Keep it under 2 sentences. Do not add warnings. Only simplify.",
        messages: [{ role: "user", content: text }],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API Error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json() as { content: { text: string }[] };
    return json.content[0].text;
  }

  /**
   * Full simplification pipeline:
   * 1. Pre-process with dictionary lookups (replace known abbreviations)
   * 2. Send to AI for natural language simplification
   * 3. Gracefully fall back to dictionary-only result if AI is unavailable
   */
  static async simplifyInstruction(rawText: string): Promise<SimplifiedResult> {
    const words = rawText.split(/[\s,]+/);
    const replacements: { term: string; meaning: string }[] = [];
    let preProcessedText = rawText;

    for (const word of words) {
      const cleanWord = word.replace(/[^a-zA-Z]/g, "");
      if (cleanWord.length > 0) {
        const meaning = await this.lookupAbbreviation(cleanWord);
        if (meaning) {
          if (!replacements.find(r => r.term === cleanWord.toUpperCase())) {
            replacements.push({ term: cleanWord.toUpperCase(), meaning });
          }
          const regex = new RegExp(`\\b${cleanWord}\\b`, "gi");
          preProcessedText = preProcessedText.replace(regex, meaning);
        }
      }
    }

    let simplified = preProcessedText;
    let aiUnavailable = false;

    try {
      simplified = await this.simplifyWithAI(preProcessedText);
    } catch {
      // AI unavailable — fall back to dictionary-preprocessed text
      aiUnavailable = true;
    }

    return { original: rawText, simplified, replacements, aiUnavailable };
  }
}
