import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimPressable } from "@/components/AnimPressable";
import { TranslateText as Text } from "@/components/TranslateText";
import { useApp } from "@/context/AppContext";
import { useSmartSOS } from "@/context/SmartSOSProvider";
import {
  loadSosSettings,
  saveSosSettings,
  type ShakeSensitivity,
  type SosSettings,
} from "@/utils/sosSettings";

const PURPLE = "#6C47FF";
const WHITE = "#ffffff";
const BACKGROUND = "#F5F4FB";
const CARD_BG = "#ffffff";
const FOREGROUND = "#1E1B4B";
const MUTED = "#6B7280";
const BORDER = "#E8E4FF";
const DESTRUCTIVE = "#EF4444";
const SUCCESS = "#10B981";

const RAPID_TAP_COUNT = 5;
const RAPID_TAP_WINDOW_MS = 2500;

export default function SmartSosScreen() {
  const insets = useSafeAreaInsets();
  const { startSos, settings: liveSettings } = useSmartSOS();
  const { patient } = useApp();
  const topInset = Platform.OS === "web" ? 0 : insets.top;

  const [settings, setSettings] = useState<SosSettings>(liveSettings);
  const [tapCount, setTapCount] = useState(0);
  const tapsRef = useRef<number[]>([]);

  useEffect(() => {
    loadSosSettings().then(setSettings);
  }, []);

  const update = (patch: Partial<SosSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSosSettings(next);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePanicTap = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const now = Date.now();
    tapsRef.current = tapsRef.current.filter((t) => now - t < RAPID_TAP_WINDOW_MS);
    tapsRef.current.push(now);
    setTapCount(tapsRef.current.length);

    if (tapsRef.current.length >= RAPID_TAP_COUNT) {
      tapsRef.current = [];
      setTapCount(0);
      startSos("rapid-tap");
    }
  };

  // Decay the visible tap counter when the user stops tapping
  useEffect(() => {
    if (tapCount === 0) return;
    const id = setTimeout(() => {
      tapsRef.current = [];
      setTapCount(0);
    }, RAPID_TAP_WINDOW_MS);
    return () => clearTimeout(id);
  }, [tapCount]);

  const SENSITIVITIES: ShakeSensitivity[] = ["low", "medium", "high"];

  return (
    <View style={[styles.container, { backgroundColor: BACKGROUND }]}>
      <LinearGradient
        colors={["#4B26C8", PURPLE, "#8B5CF6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerBg, { paddingTop: topInset + 20 }]}
      >
        <View style={styles.decor1} />
        <View style={styles.decor2} />
        <View style={styles.headerTop}>
          <AnimPressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={20} color={WHITE} />
          </AnimPressable>
          <Text style={styles.headerTitle}>Smart Emergency</Text>
          <View style={{ width: 38 }} />
        </View>
        <Text style={styles.headerSub}>Shake or tap to call for help instantly</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Panic button — 5× rapid tap */}
        <View style={[styles.panicCard, { backgroundColor: `${DESTRUCTIVE}0D`, borderColor: `${DESTRUCTIVE}33` }]}>
          <Text style={[styles.panicTitle, { color: DESTRUCTIVE }]}>Panic Button</Text>
          <Text style={[styles.panicSub, { color: MUTED }]}>
            Tap {RAPID_TAP_COUNT} times fast to start the SOS countdown
          </Text>

          <AnimPressable onPress={handlePanicTap} style={styles.panicBtn}>
            <Feather name="alert-octagon" size={48} color={WHITE} />
            <Text style={styles.panicBtnText}>SOS</Text>
          </AnimPressable>

          <View style={styles.dotsRow}>
            {Array.from({ length: RAPID_TAP_COUNT }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i < tapCount ? DESTRUCTIVE : `${DESTRUCTIVE}25` },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.tapHint, { color: MUTED }]}>
            {tapCount > 0 ? `${RAPID_TAP_COUNT - tapCount} more tap${RAPID_TAP_COUNT - tapCount === 1 ? "" : "s"}` : " "}
          </Text>
        </View>

        {/* Master enable */}
        <SettingRow
          icon="shield"
          title="Smart Emergency Detection"
          subtitle="Master switch for shake & gesture triggers"
          value={settings.enabled}
          onValueChange={(v) => update({ enabled: v })}
        />

        {/* Shake to SOS */}
        <SettingRow
          icon="smartphone"
          title="Shake to SOS"
          subtitle="Vigorously shake the phone to trigger help"
          value={settings.shakeEnabled}
          disabled={!settings.enabled}
          onValueChange={(v) => update({ shakeEnabled: v })}
        />

        {settings.enabled && settings.shakeEnabled && (
          <View style={[styles.card, { backgroundColor: CARD_BG, borderColor: BORDER }]}>
            <Text style={[styles.cardLabel, { color: FOREGROUND }]}>Shake Sensitivity</Text>
            <View style={styles.segment}>
              {SENSITIVITIES.map((s) => {
                const active = settings.shakeSensitivity === s;
                return (
                  <AnimPressable
                    key={s}
                    onPress={() => update({ shakeSensitivity: s })}
                    style={[
                      styles.segmentBtn,
                      { backgroundColor: active ? PURPLE : "transparent" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: active ? WHITE : MUTED },
                      ]}
                    >
                      {s[0].toUpperCase() + s.slice(1)}
                    </Text>
                  </AnimPressable>
                );
              })}
            </View>
          </View>
        )}

        {/* 5x tap */}
        <SettingRow
          icon="zap"
          title="5× Rapid-Tap Trigger"
          subtitle="Tap the panic button 5 times quickly"
          value={settings.rapidTapEnabled}
          disabled={!settings.enabled}
          onValueChange={(v) => update({ rapidTapEnabled: v })}
        />

        {/* Countdown length */}
        <View style={[styles.card, { backgroundColor: CARD_BG, borderColor: BORDER }]}>
          <Text style={[styles.cardLabel, { color: FOREGROUND }]}>Cancel Window</Text>
          <Text style={[styles.cardHint, { color: MUTED }]}>
            Time to cancel before the alert is sent
          </Text>
          <View style={styles.segment}>
            {[3, 5, 10].map((sec) => {
              const active = settings.countdownSeconds === sec;
              return (
                <AnimPressable
                  key={sec}
                  onPress={() => update({ countdownSeconds: sec })}
                  style={[
                    styles.segmentBtn,
                    { backgroundColor: active ? PURPLE : "transparent" },
                  ]}
                >
                  <Text style={[styles.segmentText, { color: active ? WHITE : MUTED }]}>
                    {sec}s
                  </Text>
                </AnimPressable>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: FOREGROUND }]}>When triggered</Text>

        <SettingRow
          icon="map-pin"
          title="Share My Location"
          subtitle="Attach a live GPS map link to the alert"
          value={settings.shareLocation}
          onValueChange={(v) => update({ shareLocation: v })}
        />
        <SettingRow
          icon="message-square"
          title="Text Emergency Contact"
          subtitle={
            patient?.emergencyContact
              ? `SMS ${patient.emergencyContact} with my location`
              : "No emergency contact set in profile"
          }
          value={settings.sendSms}
          onValueChange={(v) => update({ sendSms: v })}
        />
        <SettingRow
          icon="phone-call"
          title="Auto-Call for Help"
          subtitle={`Place a call to ${settings.callNumber || "112"}`}
          value={settings.autoCall}
          onValueChange={(v) => update({ autoCall: v })}
        />

        <View style={[styles.infoCard, { backgroundColor: `${SUCCESS}10`, borderColor: `${SUCCESS}30` }]}>
          <Feather name="info" size={18} color={SUCCESS} />
          <Text style={[styles.infoText, { color: FOREGROUND }]}>
            Triggering SOS alerts your caregiver, emails all linked family members with your GPS location, shares your location, and calls for
            help — with a {settings.countdownSeconds}s window to cancel if it was an
            accident.
          </Text>
        </View>

        <AnimPressable
          style={[styles.testBtn, { borderColor: DESTRUCTIVE }]}
          onPress={() => startSos("manual")}
        >
          <Feather name="play" size={16} color={DESTRUCTIVE} />
          <Text style={[styles.testBtnText, { color: DESTRUCTIVE }]}>
            Test SOS (cancellable)
          </Text>
        </AnimPressable>
      </ScrollView>
    </View>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
}: {
  icon: any;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View
      style={[
        styles.settingRow,
        { backgroundColor: CARD_BG, borderColor: BORDER, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      <View style={[styles.settingIcon, { backgroundColor: `${PURPLE}15` }]}>
        <Feather name={icon} size={18} color={PURPLE} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingTitle, { color: FOREGROUND }]}>{title}</Text>
        <Text style={[styles.settingSub, { color: MUTED }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "#D1D5DB", true: PURPLE }}
        thumbColor={WHITE}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBg: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 4,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: "hidden",
  },
  decor1: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.05)", top: -60, right: -50,
  },
  decor2: {
    position: "absolute", width: 110, height: 110, borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.04)", bottom: -20, left: -20,
  },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: WHITE },
  headerSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },

  panicCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  panicTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  panicSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  panicBtn: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: DESTRUCTIVE,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
    shadowColor: DESTRUCTIVE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  panicBtnText: { color: WHITE, fontSize: 26, fontFamily: "Inter_700Bold", marginTop: 2 },
  dotsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  tapHint: { fontSize: 13, fontFamily: "Inter_500Medium", height: 18 },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  settingIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  settingTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  settingSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },

  card: { padding: 16, borderRadius: 18, borderWidth: 1.5, marginBottom: 12, gap: 10 },
  cardLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardHint: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -4 },
  segment: { flexDirection: "row", backgroundColor: "#F3F0FF", borderRadius: 14, padding: 4 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  segmentText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 8, marginBottom: 12 },

  infoCard: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginTop: 8,
    marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },

  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  testBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
