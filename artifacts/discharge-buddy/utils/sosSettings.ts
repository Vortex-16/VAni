import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Smart Emergency Button settings — persisted to AsyncStorage (the app's
 * established persistence layer, see conversationMemory.ts / AppContext).
 *
 * Purely additive + self-contained: no chatbot/voice coupling. The
 * SmartSOSProvider loads these on mount and re-loads whenever a subscriber
 * notifies (e.g. the settings screen saves a change).
 */

const STORAGE_KEY = "discharge_buddy_sos_settings_v1";

export type ShakeSensitivity = "low" | "medium" | "high";

export interface SosSettings {
  /** Master switch for the whole Smart Emergency system. */
  enabled: boolean;
  /** Shake the phone to trigger the SOS countdown. */
  shakeEnabled: boolean;
  /** How hard you must shake (maps to an accelerometer g-force threshold). */
  shakeSensitivity: ShakeSensitivity;
  /** 5× rapid-tap on the panic widget triggers the SOS countdown. */
  rapidTapEnabled: boolean;
  /** Seconds the user has to cancel before the SOS actually fires. */
  countdownSeconds: number;
  /** Capture GPS and attach a Google Maps link to the alert / SMS. */
  shareLocation: boolean;
  /** After the alert is sent, place a phone call. */
  autoCall: boolean;
  /** Number dialled when autoCall is on ("112" by default, or a contact). */
  callNumber: string;
  /** Also open the SMS composer to the emergency contact with location. */
  sendSms: boolean;
}

export const DEFAULT_SOS_SETTINGS: SosSettings = {
  enabled: true,
  shakeEnabled: true,
  shakeSensitivity: "medium",
  rapidTapEnabled: true,
  countdownSeconds: 5,
  shareLocation: true,
  autoCall: true,
  callNumber: "112",
  sendSms: true,
};

/** Accelerometer total-acceleration threshold (in g) per sensitivity. */
export const SHAKE_THRESHOLD_G: Record<ShakeSensitivity, number> = {
  low: 2.7, // must shake hard
  medium: 2.0,
  high: 1.5, // gentle shake triggers
};

export async function loadSosSettings(): Promise<SosSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SOS_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<SosSettings>;
    // Merge so newly-added keys always have a default.
    return { ...DEFAULT_SOS_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SOS_SETTINGS };
  }
}

export async function saveSosSettings(settings: SosSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    notify(settings);
  } catch {
    // best-effort; settings are non-critical
  }
}

// --- tiny pub/sub so the provider live-updates when the settings screen saves ---
type Listener = (s: SosSettings) => void;
const listeners = new Set<Listener>();

export function subscribeSosSettings(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(settings: SosSettings) {
  listeners.forEach((fn) => {
    try {
      fn(settings);
    } catch {
      // ignore listener errors
    }
  });
}
