import AsyncStorage from "@react-native-async-storage/async-storage";

// Phase 5 — Memory & Persistence.
// A tiny, self-contained conversation store shared by the chat screen and the
// voice assistant so Buddy can resolve follow-ups ("and the other one?") within
// and across app launches. Built on AsyncStorage (the app's existing persistence
// layer) rather than a new native dependency. History is namespaced per user and
// wiped on logout for privacy.

export type ConversationRole = "user" | "assistant";

export interface ConversationTurn {
  role: ConversationRole;
  text: string;
  ts: number;
}

const KEY_PREFIX = "discharge_buddy_convo_v1:";

// Keep storage bounded; the most recent turns are the ones that matter.
const MAX_STORED_TURNS = 40;
// How many recent turns to feed the LLM as context. Small to keep latency/tokens low.
const DEFAULT_PROMPT_TURNS = 6;

function keyFor(userKey?: string | null): string {
  return KEY_PREFIX + (userKey && userKey.trim() ? userKey.trim() : "guest");
}

export async function loadHistory(userKey?: string | null): Promise<ConversationTurn[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is ConversationTurn =>
        t && (t.role === "user" || t.role === "assistant") && typeof t.text === "string",
    );
  } catch (err) {
    console.warn("[ConversationMemory] load failed:", err);
    return [];
  }
}

export async function appendTurns(
  userKey: string | null | undefined,
  turns: Array<{ role: ConversationRole; text: string }>,
): Promise<ConversationTurn[]> {
  const clean = turns
    .filter((t) => t && typeof t.text === "string" && t.text.trim())
    .map((t) => ({ role: t.role, text: t.text.trim(), ts: Date.now() }));
  if (clean.length === 0) return loadHistory(userKey);

  try {
    const existing = await loadHistory(userKey);
    const merged = [...existing, ...clean].slice(-MAX_STORED_TURNS);
    await AsyncStorage.setItem(keyFor(userKey), JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.warn("[ConversationMemory] append failed:", err);
    return loadHistory(userKey);
  }
}

// The compact window handed to the chat API. Strips timestamps; backend caps again.
export function recentForPrompt(
  history: ConversationTurn[],
  k: number = DEFAULT_PROMPT_TURNS,
): Array<{ role: ConversationRole; text: string }> {
  return history.slice(-k).map(({ role, text }) => ({ role, text }));
}

export async function clearHistory(userKey?: string | null): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(userKey));
  } catch (err) {
    console.warn("[ConversationMemory] clear failed:", err);
  }
}
