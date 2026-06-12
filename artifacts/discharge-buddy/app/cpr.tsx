import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimPressable } from "@/components/AnimPressable";
import { TranslateText as Text } from "@/components/TranslateText";
import { LOCALE_BY_LANG } from "@/constants/translations";
import { useApp } from "@/context/AppContext";
import { soundHelper } from "@/utils/SoundHelper";

const PURPLE = "#6C47FF";
const WHITE = "#ffffff";
const BACKGROUND = "#F5F4FB";
const CARD_BG = "#ffffff";
const FOREGROUND = "#1E1B4B";
const MUTED = "#6B7280";
const BORDER = "#E8E4FF";
const DESTRUCTIVE = "#EF4444";
const SUCCESS = "#10B981";
const WARNING = "#F59E0B";

const BPM = 110;
const BEAT_MS = Math.round(60000 / BPM); // ~545ms
const COMPRESSIONS_PER_CYCLE = 30;

type ModeKey = "adult" | "child" | "infant" | "choking";

interface CprMode {
  key: ModeKey;
  label: string;
  ageHint: string;
  icon: any;
  color: string;
  isChoking?: boolean;
  depth: string;
  hands: string;
  ratio: string;
  intro: string;
  steps: string[];
}

const MODES: CprMode[] = [
  {
    key: "adult",
    label: "Adult CPR",
    ageHint: "Teen & adult",
    icon: "user",
    color: "#EF4444",
    depth: "5–6 cm (about 2 inches)",
    hands: "Two hands, heel on centre of chest",
    ratio: "30 compressions : 2 breaths",
    intro:
      "Adult CPR. Place the heel of one hand on the centre of the chest, your other hand on top. Push hard and fast, at least five centimetres deep. Follow the beat.",
    steps: [
      "Check for danger, then check if the person responds. Shout and tap their shoulders.",
      "If no response and no normal breathing, call emergency services or ask someone to call now.",
      "Kneel beside them. Place the heel of one hand on the centre of the chest, the other hand on top, fingers interlocked.",
      "Push hard and fast — 5 to 6 cm deep — at 100 to 120 beats per minute. Let the chest fully recoil between pushes.",
      "After 30 compressions, give 2 rescue breaths: tilt the head back, lift the chin, pinch the nose and give a 1-second breath until the chest rises.",
      "Continue 30:2 without stopping until help arrives or the person starts to breathe.",
    ],
  },
  {
    key: "child",
    label: "Child CPR",
    ageHint: "Age 1 to puberty",
    icon: "users",
    color: "#8B5CF6",
    depth: "About 5 cm (one-third of chest depth)",
    hands: "One or two hands, centre of chest",
    ratio: "30 compressions : 2 breaths (single rescuer)",
    intro:
      "Child CPR. Use one or two hands on the centre of the chest. Push about one-third of the chest depth. Follow the beat.",
    steps: [
      "Check for danger and response. Tap the child and shout to see if they react.",
      "If unresponsive and not breathing normally, give 5 initial rescue breaths first.",
      "Then start compressions: use one or two hands on the centre of the chest.",
      "Push about one-third of the chest depth (around 5 cm) at 100 to 120 per minute, allowing full recoil.",
      "After every 30 compressions, give 2 rescue breaths.",
      "Continue 30:2. If alone, do CPR for about 1 minute before calling for help if no one else can.",
    ],
  },
  {
    key: "infant",
    label: "Infant CPR",
    ageHint: "Under 1 year",
    icon: "heart",
    color: "#EC4899",
    depth: "About 4 cm (one-third of chest depth)",
    hands: "Two fingers, just below the nipple line",
    ratio: "30 compressions : 2 breaths (single rescuer)",
    intro:
      "Infant CPR. Use two fingers on the centre of the chest, just below the nipple line. Push about four centimetres deep. Follow the beat.",
    steps: [
      "Check response: gently tap the foot and call the baby's name. Never shake an infant.",
      "If unresponsive and not breathing normally, give 5 initial rescue breaths covering the mouth and nose.",
      "Place 2 fingers on the centre of the chest, just below the nipple line.",
      "Push about 4 cm — one-third of the chest depth — at 100 to 120 per minute, allowing full recoil.",
      "After every 30 compressions, give 2 gentle puffs of air, just enough to see the chest rise.",
      "Continue 30:2. If alone, do CPR for about 1 minute before calling for help if no one else can.",
    ],
  },
  {
    key: "choking",
    label: "Choking",
    ageHint: "Back blows & thrusts",
    icon: "wind",
    color: "#F59E0B",
    isChoking: true,
    depth: "—",
    hands: "Back blows + abdominal thrusts",
    ratio: "5 back blows : 5 thrusts",
    intro:
      "Choking response. If the person cannot cough, speak or breathe, act now. Give five firm back blows, then five abdominal thrusts. Repeat.",
    steps: [
      "Ask 'Are you choking?' If they can cough forcefully, encourage them to keep coughing.",
      "If they cannot cough, speak or breathe, stand behind and slightly to the side.",
      "Give 5 firm back blows between the shoulder blades with the heel of your hand.",
      "If that fails, give 5 abdominal thrusts: fist just above the navel, grasp with your other hand and pull sharply inward and upward.",
      "Alternate 5 back blows and 5 abdominal thrusts until the object clears.",
      "If the person becomes unresponsive, call emergency services and begin CPR.",
    ],
  },
];

export default function CprScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useApp();
  const topInset = Platform.OS === "web" ? 0 : insets.top;
  useKeepAwake(); // keep the screen on during a rescue

  const [mode, setMode] = useState<CprMode>(MODES[0]);

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
            onPress={() => {
              Speech.stop();
              router.canGoBack() ? router.back() : router.replace("/(tabs)");
            }}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={20} color={WHITE} />
          </AnimPressable>
          <Text style={styles.headerTitle}>CPR Assistant</Text>
          <AnimPressable
            style={styles.callBtn}
            onPress={() => Linking.openURL("tel:112")}
          >
            <Feather name="phone" size={16} color={WHITE} />
            <Text style={styles.callBtnText}>112</Text>
          </AnimPressable>
        </View>
        <Text style={styles.headerSub}>
          {mode.ratio}
        </Text>
      </LinearGradient>

      {/* Top Selector */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {MODES.map((m) => {
            const isSelected = mode.key === m.key;
            return (
              <AnimPressable
                key={m.key}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMode(m);
                }}
                style={[
                  styles.tabButton,
                  {
                    backgroundColor: isSelected ? m.color : CARD_BG,
                    borderColor: isSelected ? m.color : BORDER,
                  }
                ]}
              >
                <Text style={[styles.tabButtonText, { color: isSelected ? WHITE : MUTED }]}>
                  {m.label}
                </Text>
              </AnimPressable>
            );
          })}
        </ScrollView>
      </View>

      <CprGuide key={mode.key} mode={mode} language={language} insets={insets} />
    </View>
  );
}



function CprGuide({
  mode,
  language,
  insets,
}: {
  mode: CprMode;
  language: string;
  insets: { bottom: number };
}) {
  const [running, setRunning] = useState(false);
  const [compressions, setCompressions] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [voiceOn, setVoiceOn] = useState(true);
  const [soundOn, setSoundOn] = useState(Platform.OS !== "web");

  const scale = useSharedValue(1);
  const beatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // refs so the interval closure reads live values without re-subscribing
  const voiceRef = useRef(voiceOn);
  voiceRef.current = voiceOn;
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const compRef = useRef(0);

  const locale = LOCALE_BY_LANG[language as keyof typeof LOCALE_BY_LANG] || "en-US";

  const speak = useCallback(
    (text: string) => {
      if (!voiceRef.current) return;
      Speech.stop();
      Speech.speak(text, { language: locale, rate: 0.98, pitch: 1.0 });
    },
    [locale],
  );

  const stopTimers = useCallback(() => {
    if (beatTimer.current) {
      clearInterval(beatTimer.current);
      beatTimer.current = null;
    }
    if (elapsedTimer.current) {
      clearInterval(elapsedTimer.current);
      elapsedTimer.current = null;
    }
    cancelAnimation(scale);
    scale.value = withTiming(1, { duration: 150 });
  }, [scale]);

  const beat = useCallback(() => {
    // haptic + optional click on every compression
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (soundRef.current) soundHelper.playTing().catch(() => { });

    compRef.current += 1;
    const c = compRef.current;

    if (mode.isChoking) {
      // choking uses a 5+5 rhythm — announce the switch
      if (c === 5) speak("Now five abdominal thrusts");
      if (c >= 10) {
        compRef.current = 0;
        setCycles((cy) => cy + 1);
        speak("Repeat. Five back blows");
      }
      setCompressions(compRef.current);
      return;
    }

    if (c >= COMPRESSIONS_PER_CYCLE) {
      compRef.current = 0;
      setCompressions(0);
      setCycles((cy) => cy + 1);
      speak("Thirty. Give two rescue breaths now.");
    } else {
      setCompressions(c);
      // light spoken coaching at the cadence midpoints
      if (c === 15) speak("Keep pushing hard and fast");
    }
  }, [mode.isChoking, speak]);

  const start = useCallback(() => {
    if (running) return;
    setRunning(true);
    speak(mode.intro);

    // pulsing animation synced to the beat
    scale.value = withRepeat(
      withSequence(
        withTiming(0.74, { duration: Math.round(BEAT_MS * 0.42) }),
        withTiming(1, { duration: Math.round(BEAT_MS * 0.58) }),
      ),
      -1,
      false,
    );

    beatTimer.current = setInterval(beat, BEAT_MS);
    elapsedTimer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, [beat, mode.intro, running, scale, speak]);

  const pause = useCallback(() => {
    setRunning(false);
    stopTimers();
    Speech.stop();
  }, [stopTimers]);

  const reset = useCallback(() => {
    setRunning(false);
    stopTimers();
    Speech.stop();
    compRef.current = 0;
    setCompressions(0);
    setCycles(0);
    setElapsed(0);
  }, [stopTimers]);

  // cleanup on unmount / mode change
  useEffect(() => {
    return () => {
      stopTimers();
      Speech.stop();
    };
  }, [stopTimers]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const targetCount = mode.isChoking ? 10 : COMPRESSIONS_PER_CYCLE;
  const phaseLabel = mode.isChoking
    ? compressions < 5
      ? "Back blows"
      : "Abdominal thrusts"
    : running
      ? "Push"
      : "Ready";

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Live coach */}
      <View style={[styles.coachCard, { backgroundColor: CARD_BG, borderColor: BORDER }]}>
        <View style={styles.statsRow}>
          <Stat label="Compressions" value={`${compressions}/${targetCount}`} color={mode.color} />
          <Stat label="Cycles" value={`${cycles}`} color={SUCCESS} />
          <Stat label="Time" value={`${mm}:${ss}`} color={PURPLE} />
        </View>

        <View style={styles.pulseWrap}>
          <Animated.View style={[styles.pulse, { backgroundColor: `${mode.color}1A`, borderColor: mode.color }, animStyle]}>
            <Feather name={mode.isChoking ? "wind" : "heart"} size={44} color={mode.color} />
            <Text style={[styles.pulseText, { color: mode.color }]}>{phaseLabel}</Text>
          </Animated.View>
        </View>

        <Text style={[styles.bpmText, { color: MUTED }]}>
          {mode.isChoking ? "Follow the rhythm — 5 back blows, 5 thrusts" : `${BPM} beats per minute`}
        </Text>

        <AnimPressable
          onPress={running ? pause : start}
          style={[styles.primaryCtrl, { backgroundColor: running ? WARNING : mode.color, width: "100%", marginBottom: 16 }]}
        >
          <Feather name={running ? "pause" : "play"} size={26} color={WHITE} />
          <Text style={styles.primaryCtrlText}>{running ? "Pause CPR" : "Start CPR"}</Text>
        </AnimPressable>

        <View style={styles.toggleRow}>
          <AnimPressable onPress={reset} style={[styles.secondaryCtrl, { backgroundColor: "#F3F0FF" }]}>
            <Feather name="rotate-ccw" size={12} color={PURPLE} />
            <Text style={[styles.toggleText, { color: PURPLE }]} numberOfLines={1} adjustsFontSizeToFit>Reset</Text>
          </AnimPressable>

          <AnimPressable
            onPress={() => {
              setVoiceOn((v) => !v);
              if (voiceOn) Speech.stop();
            }}
            style={[styles.secondaryCtrl, { backgroundColor: voiceOn ? `${PURPLE}15` : "#F3F0FF" }]}
          >
            <Feather name={voiceOn ? "volume-2" : "volume-x"} size={12} color={voiceOn ? PURPLE : MUTED} />
            <Text style={[styles.toggleText, { color: voiceOn ? PURPLE : MUTED }]} numberOfLines={1} adjustsFontSizeToFit>Voice</Text>
          </AnimPressable>

          <AnimPressable
            onPress={() => setSoundOn((s) => !s)}
            style={[styles.secondaryCtrl, { backgroundColor: soundOn ? `${PURPLE}15` : "#F3F0FF" }]}
          >
            <Feather name={soundOn ? "music" : "bell-off"} size={12} color={soundOn ? PURPLE : MUTED} />
            <Text style={[styles.toggleText, { color: soundOn ? PURPLE : MUTED }]} numberOfLines={1} adjustsFontSizeToFit>Beep</Text>
          </AnimPressable>
        </View>
      </View>

      {/* Key facts */}
      {!mode.isChoking && (
        <View style={[styles.factsCard, { backgroundColor: CARD_BG, borderColor: BORDER }]}>
          <Fact icon="maximize-2" label="Depth" value={mode.depth} />
          <Fact icon="target" label="Hands" value={mode.hands} />
          <Fact icon="repeat" label="Ratio" value={mode.ratio} />
        </View>
      )}

      {/* Steps */}
      <View style={styles.stepsHeader}>
        <Text style={[styles.sectionTitle, { color: FOREGROUND, marginBottom: 0 }]}>Steps</Text>
        <AnimPressable
          onPress={() => speak(mode.steps.map((s, i) => `Step ${i + 1}. ${s}`).join(" "))}
          style={[styles.readBtn, { borderColor: PURPLE }]}
        >
          <Feather name="volume-2" size={14} color={PURPLE} />
          <Text style={[styles.readBtnText, { color: PURPLE }]}>Read aloud</Text>
        </AnimPressable>
      </View>

      {mode.steps.map((step, i) => (
        <View key={i} style={[styles.stepRow, { backgroundColor: CARD_BG, borderColor: BORDER }]}>
          <View style={[styles.stepNum, { backgroundColor: mode.color }]}>
            <Text style={styles.stepNumText}>{i + 1}</Text>
          </View>
          <Text style={[styles.stepText, { color: FOREGROUND }]}>{step}</Text>
          <AnimPressable onPress={() => speak(step)} style={styles.stepSpeak}>
            <Feather name="volume-1" size={16} color={MUTED} />
          </AnimPressable>
        </View>
      ))}

      <View style={[styles.warnCard, { backgroundColor: `${WARNING}10`, borderColor: `${WARNING}33`, marginTop: 8 }]}>
        <Feather name="info" size={18} color={WARNING} />
        <Text style={[styles.warnText, { color: FOREGROUND }]}>
          Don't stop compressions for more than 10 seconds. Keep going until emergency
          help arrives or the person starts breathing normally.
        </Text>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: MUTED }]}>{label}</Text>
    </View>
  );
}

function Fact({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.factRow}>
      <View style={[styles.factIcon, { backgroundColor: `${PURPLE}12` }]}>
        <Feather name={icon} size={16} color={PURPLE} />
      </View>
      <Text style={[styles.factLabel, { color: MUTED }]}>{label}</Text>
      <Text style={[styles.factValue, { color: FOREGROUND }]}>{value}</Text>
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
  callBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: DESTRUCTIVE, paddingHorizontal: 12, height: 38, borderRadius: 19,
  },
  callBtnText: { color: WHITE, fontSize: 14, fontFamily: "Inter_700Bold" },

  warnCard: {
    flexDirection: "row", gap: 12, padding: 16, borderRadius: 16, borderWidth: 1.5, marginBottom: 16,
  },
  warnText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },

  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 14 },

  modeCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 18, borderWidth: 1.5, marginBottom: 12,
  },
  modeIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  modeLabel: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modeHint: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },

  tabContainer: { flexDirection: "row", paddingHorizontal: 0, paddingTop: 16, paddingBottom: 8 },
  tabScroll: { gap: 8, paddingHorizontal: 16 },
  tabButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5 },
  tabButtonText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },

  coachCard: { padding: 20, borderRadius: 24, borderWidth: 1.5, marginBottom: 16, alignItems: "center" },
  statsRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 8 },
  stat: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  pulseWrap: { height: 200, alignItems: "center", justifyContent: "center", marginVertical: 6 },
  pulse: {
    width: 170, height: 170, borderRadius: 85, borderWidth: 3,
    alignItems: "center", justifyContent: "center", gap: 6,
  },
  pulseText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  bpmText: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 14 },
  primaryCtrl: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    minHeight: 68, borderRadius: 22, width: "100%",
  },
  primaryCtrlText: { color: WHITE, fontSize: 17, fontFamily: "Inter_700Bold" },
  toggleRow: { flexDirection: "row", width: "100%", justifyContent: "center", alignItems: "center", textAlign: "center", marginTop: 4, gap: 8 },
  secondaryCtrl: {
    flex: 1, minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 8, borderRadius: 12, gap: 4,
  },
  toggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  factsCard: { padding: 16, borderRadius: 18, borderWidth: 1.5, marginBottom: 16, gap: 12 },
  factRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  factIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  factLabel: { fontSize: 13, fontFamily: "Inter_500Medium", width: 56 },
  factValue: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },

  stepsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  readBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5,
  },
  readBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  stepRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 10,
  },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  stepNumText: { color: WHITE, fontSize: 14, fontFamily: "Inter_700Bold" },
  stepText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  stepSpeak: { padding: 4 },
});
