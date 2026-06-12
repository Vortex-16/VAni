import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Linking, Modal, Platform, StyleSheet, View } from "react-native";
import { DotLoader } from "../components/DotLoader";

import { AnimPressable } from "@/components/AnimPressable";
import { TranslateText as Text } from "@/components/TranslateText";
import { useApp } from "@/context/AppContext";
import { useShakeDetection } from "@/hooks/useShakeDetection";
import { getApiUrl } from "@/utils/apiUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_SOS_SETTINGS,
  loadSosSettings,
  subscribeSosSettings,
  type SosSettings,
} from "@/utils/sosSettings";

const DESTRUCTIVE = "#EF4444";
const SUCCESS = "#10B981";
const WHITE = "#ffffff";
const FOREGROUND = "#1E1B4B";
const MUTED = "#6B7280";

export type SosSource = "shake" | "rapid-tap" | "manual";
type SosStatus = "idle" | "counting" | "sending" | "sent" | "error";

interface SmartSOSContextValue {
  /** Start the cancellable SOS countdown. */
  startSos: (source: SosSource) => void;
  /** Skip the countdown and fire immediately. */
  fireNow: () => void;
  /** Cancel an in-progress countdown. */
  cancelSos: () => void;
  status: SosStatus;
  settings: SosSettings;
}

const SmartSOSContext = createContext<SmartSOSContextValue | null>(null);

export function useSmartSOS(): SmartSOSContextValue {
  const ctx = useContext(SmartSOSContext);
  if (!ctx) {
    throw new Error("useSmartSOS must be used within SmartSOSProvider");
  }
  return ctx;
}

export function SmartSOSProvider({ children }: { children: React.ReactNode }) {
  const { triggerEmergency, patient, hapticsEnabled } = useApp();

  const [settings, setSettings] = useState<SosSettings>(DEFAULT_SOS_SETTINGS);
  const [status, setStatus] = useState<SosStatus>("idle");
  const [remaining, setRemaining] = useState(0);
  const [source, setSource] = useState<SosSource>("manual");
  const [detail, setDetail] = useState<string>("");

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Load + live-update settings
  useEffect(() => {
    loadSosSettings().then(setSettings);
    const unsub = subscribeSosSettings(setSettings);
    return () => {
      unsub();
    };
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const buzz = useCallback(
    (type: "warn" | "ok" | "tick") => {
      if (!hapticsEnabled || Platform.OS === "web") return;
      if (type === "warn") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else if (type === "ok") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    },
    [hapticsEnabled],
  );

  const fire = useCallback(async () => {
    clearCountdown();
    setStatus("sending");
    setDetail("Alerting your caregiver…");
    buzz("warn");

    const s = settingsRef.current;

    // 1) Caregiver alert (backend round-trip)
    try {
      await triggerEmergency();
    } catch {
      // continue regardless — the call/SMS below are the fallback
    }

    // 2) Location capture (best-effort)
    let mapsLink = "";
    if (s.shareLocation) {
      setDetail("Getting your location…");
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (perm === "granted") {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const { latitude, longitude } = pos.coords;
          mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
        }
      } catch {
        // location optional
      }
    }

    setStatus("sent");
    buzz("ok");

    // 3) Notify family members via email (async, best-effort)
    (async () => {
      try {
        const token = await AsyncStorage.getItem("discharge_buddy_token");
        const apiUrl = getApiUrl();
        const locPayload = mapsLink
          ? { lat: mapsLink.split("q=")[1]?.split(",")[0], lng: mapsLink.split(",")[1] }
          : undefined;
        await fetch(`${apiUrl}/api/auth/sos-notify-family`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ location: locPayload }),
        });
      } catch (e) {
        console.warn("[SOS] Family email notification failed:", e);
      }
    })();

    // 4) SMS the emergency contact with the location link
    const contact = patient?.emergencyContact?.replace(/[^+\d]/g, "");
    if (s.sendSms && contact) {
      const body = encodeURIComponent(
        `EMERGENCY: I need help.${mapsLink ? ` My location: ${mapsLink}` : ""}`,
      );
      const sep = Platform.OS === "ios" ? "&" : "?";
      const smsUrl = `sms:${contact}${sep}body=${body}`;
      Linking.openURL(smsUrl).catch(() => {});
    }

    // 4) Place the emergency call (slight delay so SMS composer doesn't clash)
    if (s.autoCall) {
      const number = (s.callNumber || "112").replace(/[^+\d]/g, "");
      setDetail(`Calling ${number}…`);
      setTimeout(() => {
        Linking.openURL(`tel:${number}`).catch(() => {});
      }, s.sendSms && contact ? 1200 : 300);
    } else {
      setDetail("Help is on the way.");
    }

    // Auto-dismiss the overlay after a moment
    setTimeout(() => setStatus("idle"), 6000);
  }, [buzz, clearCountdown, patient?.emergencyContact, triggerEmergency]);

  const startSos = useCallback(
    (src: SosSource) => {
      const s = settingsRef.current;
      if (!s.enabled && src !== "manual") return;
      // already in a flow — ignore re-triggers
      if (status === "counting" || status === "sending") return;

      setSource(src);
      setStatus("counting");
      const secs = Math.max(0, s.countdownSeconds);
      setRemaining(secs);
      buzz("warn");

      if (secs === 0) {
        fire();
        return;
      }

      clearCountdown();
      countdownRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearCountdown();
            fire();
            return 0;
          }
          buzz("tick");
          return r - 1;
        });
      }, 1000);
    },
    [buzz, clearCountdown, fire, status],
  );

  const fireNow = useCallback(() => {
    fire();
  }, [fire]);

  const cancelSos = useCallback(() => {
    clearCountdown();
    setStatus("idle");
    setRemaining(0);
  }, [clearCountdown]);

  // Cleanup on unmount
  useEffect(() => () => clearCountdown(), [clearCountdown]);

  // Global shake detection
  useShakeDetection(
    settings.enabled && settings.shakeEnabled,
    settings.shakeSensitivity,
    useCallback(() => startSos("shake"), [startSos]),
  );

  const sourceLabel =
    source === "shake"
      ? "Shake detected"
      : source === "rapid-tap"
        ? "Panic button pressed"
        : "Emergency triggered";

  return (
    <SmartSOSContext.Provider value={{ startSos, fireNow, cancelSos, status, settings }}>
      {children}

      <Modal
        visible={status !== "idle"}
        transparent
        animationType="fade"
        onRequestClose={cancelSos}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.iconCircle}>
              {status === "sending" ? (
                <DotLoader color={WHITE} size={12} />
              ) : (
                <Feather
                  name={status === "sent" ? "check" : "alert-triangle"}
                  size={36}
                  color={WHITE}
                />
              )}
            </View>

            {status === "counting" && (
              <>
                <Text style={styles.title}>Sending Emergency SOS</Text>
                <Text style={styles.subtitle}>{sourceLabel}</Text>
                <Text style={styles.countdown}>{remaining}</Text>
                <Text style={styles.hint}>
                  Alerting your caregiver, sharing your location and calling for help.
                </Text>

                <AnimPressable style={[styles.btn, styles.fireBtn]} onPress={fireNow}>
                  <Feather name="send" size={18} color={WHITE} />
                  <Text style={styles.fireBtnText}>Send Now</Text>
                </AnimPressable>
                <AnimPressable style={[styles.btn, styles.cancelBtn]} onPress={cancelSos}>
                  <Text style={styles.cancelBtnText}>I'm OK — Cancel</Text>
                </AnimPressable>
              </>
            )}

            {(status === "sending" || status === "sent") && (
              <>
                <Text style={styles.title}>
                  {status === "sent" ? "Help is on the way" : "Sending SOS…"}
                </Text>
                <Text style={styles.subtitle}>{detail}</Text>
                {status === "sent" && (
                  <AnimPressable
                    style={[styles.btn, styles.cancelBtn]}
                    onPress={cancelSos}
                  >
                    <Text style={styles.cancelBtnText}>Close</Text>
                  </AnimPressable>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </SmartSOSContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,10,40,0.78)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: WHITE,
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: DESTRUCTIVE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 21, fontFamily: "Inter_700Bold", color: FOREGROUND, textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_500Medium", color: MUTED, textAlign: "center" },
  countdown: {
    fontSize: 64,
    fontFamily: "Inter_700Bold",
    color: DESTRUCTIVE,
    marginVertical: 4,
  },
  hint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: MUTED,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 8,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  fireBtn: { 
    backgroundColor: DESTRUCTIVE,
    shadowColor: DESTRUCTIVE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fireBtnText: { color: WHITE, fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  cancelBtn: { backgroundColor: "#F1F5F9" },
  cancelBtnText: { color: "#475569", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
