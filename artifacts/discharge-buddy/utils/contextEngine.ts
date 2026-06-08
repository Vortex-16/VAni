import type { AppFeatureModule } from "@/hooks/assistant/useAssistantContext";

// Phase 7 — Context Engine.
// Turns the active screen into a short natural-language hint the chat LLM can use
// to resolve ambiguous, deictic queries ("what is this?", "explain that",
// "how much do I take?") that only make sense relative to what the user is looking
// at. Pure and side-effect free; consumed by the chat screen and the voice loop.

export interface ScreenContext {
  module: AppFeatureModule;
  // One-line description of the screen + what an unqualified "this"/"that" most
  // likely refers to there. Sent to the backend, not shown to the user.
  hint: string;
}

const MODULE_HINTS: Record<AppFeatureModule, string> = {
  authentication: 'the login / sign-up screen.',
  dashboard: 'the home dashboard, which summarises today\'s doses, recovery progress and reminders.',
  medicine: 'the medicines screen, which lists the patient\'s prescribed medicines, dosages and schedules. An unqualified "this" or "it" most likely refers to a medicine.',
  journal: 'the journal screen, where the patient writes recovery notes. "This" likely refers to a journal entry.',
  activity: 'the activity / progress screen, showing symptom logs and adherence trends. "This" likely refers to a symptom or a trend.',
  settings: 'the settings / profile screen (language, preferences, account).',
  chatbot: 'the chat screen, talking directly with Mr. Meddy.',
  unknown: 'an unspecified screen.',
};

export function describeScreen(module: AppFeatureModule | string | null | undefined): ScreenContext {
  const key = (module || 'unknown') as AppFeatureModule;
  const hint = MODULE_HINTS[key] || MODULE_HINTS.unknown;
  return { module: key in MODULE_HINTS ? key : 'unknown', hint };
}
