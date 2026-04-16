import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, G } from "react-native-svg";

import { MascotBuddy } from "@/components/MascotBuddy";
import { useApp } from "@/context/AppContext";

const { width, height } = Dimensions.get("window");
const isSmall = width < 360;
const WHITE = "#ffffff";
const PURPLE = "#6C47FF";

// ─── Slide Data ───────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: "1",
    gradientColors: ["#3B1FA3", "#6C47FF"] as [string, string],
    title: "Your Recovery,\nSimplified",
    subtitle: "Turns hospital discharge papers into a clear daily plan — just for you.",
    mascotMessage: "Hi! I'm Beary. I'll guide your recovery! 🐾",
    accentColor: "#A78BFA",
  },
  {
    id: "2",
    gradientColors: ["#1E1060", "#5B21B6"] as [string, string],
    title: "Never Miss\nA Dose",
    subtitle: "Smart reminders at exactly the right time. We build your schedule automatically.",
    mascotMessage: "I'll remind you every medicine, every time! ⏰",
    accentColor: "#C4B5FD",
  },
  {
    id: "3",
    gradientColors: ["#1A0A5E", "#4B26C8"] as [string, string],
    title: "Family\nAlways There",
    subtitle: "Family can monitor your recovery and get instant alerts — from anywhere.",
    mascotMessage: "Your whole family stays in the loop! 💜",
    accentColor: "#DDD6FE",
  },
];

// ─── Floating Badge ───────────────────────────────────────────────────────────
function FloatingBadge({
  x, y, label, color, iconName, delay = 0,
}: {
  x: number; y: number; label: string; color: string; iconName: any; delay?: number;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 12 }));
    translateY.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(-9, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ), -1, false
    ));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
    position: "absolute",
    left: x,
    top: y,
  }));

  return (
    <Animated.View style={style}>
      <View style={[badge.chip, { backgroundColor: `${color}28`, borderColor: `${color}55` }]}>
        <Feather name={iconName} size={11} color={color} />
        <Text style={[badge.label, { color: WHITE }]}>{label}</Text>
      </View>
    </Animated.View>
  );
}

const badge = StyleSheet.create({
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 50, borderWidth: 1,
  },
  label: { fontSize: 11, fontFamily: "Inter_500Medium" },
});

// ─── Slide 1 Visual: Healing Heart ───────────────────────────────────────────
function Slide1Visual() {
  const pulse = useSharedValue(1);
  const rotate = useSharedValue(0);
  const ring1 = useSharedValue(1);
  const ring2 = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(withSequence(
      withTiming(1.15, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) })
    ), -1, false);
    rotate.value = withRepeat(withTiming(360, { duration: 20000, easing: Easing.linear }), -1, false);
    ring1.value = withRepeat(withSequence(withTiming(1.5, { duration: 1400 }), withTiming(1, { duration: 0 })), -1, false);
    ring2.value = withDelay(500, withRepeat(withSequence(withTiming(1.9, { duration: 1600 }), withTiming(1, { duration: 0 })), -1, false));
  }, []);

  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const orbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }));
  const r1Style = useAnimatedStyle(() => ({ transform: [{ scale: ring1.value }], opacity: interpolate(ring1.value, [1, 1.5], [0.5, 0]) }));
  const r2Style = useAnimatedStyle(() => ({ transform: [{ scale: ring2.value }], opacity: interpolate(ring2.value, [1, 1.9], [0.35, 0]) }));

  return (
    <View style={vs.container}>
      {/* Pulsing rings */}
      <Animated.View style={[vs.pulseRing, { borderColor: "#A78BFA" }, r2]} />
      <Animated.View style={[vs.pulseRing, { borderColor: "#C4B5FD" }, r1]} />

      {/* Orbiting ring */}
      <Animated.View style={[vs.orbitRing, orbitStyle]}>
        <View style={[vs.orbitDot, { backgroundColor: "#C4B5FD", top: -6, left: "50%" }]} />
        <View style={[vs.orbitDot, { backgroundColor: "#DDD6FE", bottom: -6, left: "50%" }]} />
        <View style={[vs.orbitDot, { backgroundColor: "#A78BFA", left: -6, top: "50%" }]} />
        <View style={[vs.orbitDot, { backgroundColor: "#EDE9FE", right: -6, top: "50%" }]} />
      </Animated.View>

      {/* Central heart */}
      <View style={vs.centralOuter}>
        <View style={vs.centralInner}>
          <Animated.View style={heartStyle}>
            <Feather name="heart" size={isSmall ? 44 : 52} color={WHITE} />
          </Animated.View>
        </View>
      </View>

      {/* Floating badges */}
      <FloatingBadge x={12} y={50} label="Metformin 500mg" color="#C4B5FD" iconName="package" delay={200} />
      <FloatingBadge x={width * 0.48} y={40} label="Lisinopril 10mg" color="#A78BFA" iconName="package" delay={500} />
      <FloatingBadge x={20} y={height * 0.22} label="Aspirin 81mg" color="#DDD6FE" iconName="package" delay={800} />

      {/* Stats card */}
      <Animated.View entering={FadeInUp.delay(600).springify()} style={vs.statsCard}>
        <View style={vs.statsRow}>
          <Feather name="check-circle" size={13} color="#22C55E" />
          <Text style={vs.statsText}>4 doses tracked today</Text>
        </View>
      </Animated.View>
    </View>
  );
}

// Workaround: need to use r1Style / r2Style via Animated.View not shared value
const r1 = StyleSheet.create({}).r1 || {};
const r2 = StyleSheet.create({}).r2 || {};


// ─── Slide 2 Visual: Bell + Schedule ─────────────────────────────────────────
function Slide2Visual() {
  const ring1 = useSharedValue(1);
  const ring2 = useSharedValue(1);
  const bellBounce = useSharedValue(0);

  useEffect(() => {
    ring1.value = withRepeat(withSequence(withTiming(1.6, { duration: 1200 }), withTiming(1, { duration: 0 })), -1, false);
    ring2.value = withDelay(400, withRepeat(withSequence(withTiming(1.9, { duration: 1300 }), withTiming(1, { duration: 0 })), -1, false));
    bellBounce.value = withRepeat(withSequence(
      withTiming(-10, { duration: 180 }), withTiming(10, { duration: 180 }),
      withTiming(-6, { duration: 140 }), withTiming(6, { duration: 140 }),
      withTiming(0, { duration: 100 }), withTiming(0, { duration: 1800 })
    ), -1, false);
  }, []);

  const r1Style = useAnimatedStyle(() => ({ transform: [{ scale: ring1.value }], opacity: interpolate(ring1.value, [1, 1.6], [0.5, 0]) }));
  const r2Style = useAnimatedStyle(() => ({ transform: [{ scale: ring2.value }], opacity: interpolate(ring2.value, [1, 1.9], [0.35, 0]) }));
  const bellStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${bellBounce.value}deg` }] }));

  const SCHEDULE = [
    { time: "8:00 AM", med: "Metformin", done: true },
    { time: "12:00 PM", med: "Aspirin", done: true },
    { time: "8:00 PM", med: "Atorvastatin", done: false },
    { time: "9:00 PM", med: "Lisinopril", done: false },
  ];

  return (
    <View style={vs.container}>
      <View style={vs.bellPulse}>
        <Animated.View style={[vs.pulseRing, { borderColor: "#A78BFA" }, r2Style]} />
        <Animated.View style={[vs.pulseRing, { borderColor: "#C4B5FD" }, r1Style]} />
        <View style={vs.bellCircle}>
          <Animated.View style={bellStyle}>
            <Feather name="bell" size={isSmall ? 34 : 40} color={WHITE} />
          </Animated.View>
        </View>
      </View>

      <Animated.View entering={FadeInUp.delay(400).springify()} style={vs.schedCard}>
        {SCHEDULE.map((item, i) => (
          <View
            key={i}
            style={[vs.schedRow, i < SCHEDULE.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#EDE9FE" }]}
          >
            <View style={[vs.schedCheck, {
              backgroundColor: item.done ? PURPLE : "transparent",
              borderColor: item.done ? PURPLE : "#CBD5E1",
            }]}>
              {item.done && <Feather name="check" size={10} color={WHITE} />}
            </View>
            <Text style={[vs.schedTime, { color: item.done ? "#9CA3AF" : "#1E1B4B" }]}>{item.time}</Text>
            <Text style={[vs.schedMed, {
              color: item.done ? "#9CA3AF" : "#1E1B4B",
              textDecorationLine: item.done ? "line-through" : "none",
              flex: 1,
            }]} numberOfLines={1}>{item.med}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

// ─── Slide 3 Visual: Family Network ──────────────────────────────────────────
function Slide3Visual() {
  const rotate = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const centerPulse = useSharedValue(1);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.3)) });
    rotate.value = withRepeat(withTiming(360, { duration: 16000, easing: Easing.linear }), -1, false);
    centerPulse.value = withRepeat(withSequence(
      withTiming(1.12, { duration: 1000 }),
      withTiming(1, { duration: 1000 })
    ), -1, false);
  }, []);

  const orbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }));
  const centerStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: centerPulse.value }] }));

  const R = isSmall ? 88 : 100;
  const DIAM = R * 2 + 52;
  const NODES = [
    { icon: "user" as const, label: "Patient", color: "#C4B5FD", angle: 0 },
    { icon: "users" as const, label: "Family", color: "#A78BFA", angle: 72 },
    { icon: "activity" as const, label: "Doctor", color: "#DDD6FE", angle: 144 },
    { icon: "shield" as const, label: "Nurse", color: "#EDE9FE", angle: 216 },
    { icon: "phone" as const, label: "Emergency", color: "#C4B5FD", angle: 288 },
  ];

  return (
    <View style={vs.container}>
      <View style={{ width: DIAM, height: DIAM, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={[{ position: "absolute", width: DIAM, height: DIAM }, orbitStyle]}>
          {NODES.map((node, i) => {
            const rad = (node.angle * Math.PI) / 180;
            return (
              <View key={i} style={[vs.networkNode, {
                left: R + Math.cos(rad) * R - 26,
                top: R + Math.sin(rad) * R - 26,
                backgroundColor: `${node.color}28`,
                borderColor: `${node.color}70`,
              }]}>
                <Feather name={node.icon} size={isSmall ? 17 : 20} color={node.color} />
              </View>
            );
          })}
        </Animated.View>

        {/* Connection lines SVG */}
        <Svg width={DIAM} height={DIAM} style={{ position: "absolute" }}>
          {NODES.map((node, i) => {
            const rad = (node.angle * Math.PI) / 180;
            const x = R + 26 + Math.cos(rad) * R;
            const y = R + 26 + Math.sin(rad) * R;
            return (
              <Path
                key={i}
                d={`M ${DIAM / 2} ${DIAM / 2} L ${x} ${y}`}
                stroke={`${node.color}40`}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })}
        </Svg>

        <Animated.View style={[vs.centerNode, centerStyle]}>
          <Animated.View style={heartStyle}>
            <Feather name="heart" size={isSmall ? 22 : 26} color={WHITE} />
          </Animated.View>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(700).springify()} style={vs.connBadge}>
        <Feather name="wifi" size={12} color="#22C55E" />
        <Text style={vs.connText}>5 caregivers connected</Text>
      </Animated.View>
    </View>
  );
}

const VISUALS = [Slide1Visual, Slide2Visual, Slide3Visual];

// ─── Onboarding Screen ────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { setOnboarded } = useApp();
  const flatRef = useRef<FlatList>(null);
  const [current, setCurrent] = useState(0);

  const topInset = Platform.OS === "web" ? 48 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  // Button animation
  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setCurrent(viewableItems[0].index);
  }).current;

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    btnScale.value = withSequence(
      withSpring(0.94, { damping: 12 }),
      withSpring(1, { damping: 10 })
    );
    if (current < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: current + 1, animated: true });
    } else {
      setOnboarded(true);
      router.replace("/login");
    }
  };

  const goToSlide = (i: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    flatRef.current?.scrollToIndex({ index: i, animated: true });
    setCurrent(i);
  };

  const VISUAL_HEIGHT = Math.min(height * 0.5, 380);
  const slide = SLIDES[current];

  return (
    <LinearGradient colors={slide.gradientColors} style={styles.screen}>
      {/* Decorative blobs */}
      <View style={styles.decorTop} />
      <View style={styles.decorMid} />
      <View style={styles.decorBottom} />

      {/* Skip */}
      <Pressable
        onPress={() => { setOnboarded(true); router.replace("/login"); }}
        style={[styles.skipBtn, { top: topInset + 12 }]}
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Visual pager */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        keyExtractor={(item) => item.id}
        style={{ height: VISUAL_HEIGHT, flexGrow: 0, marginTop: topInset + 12 }}
        renderItem={({ item, index }) => {
          const Visual = VISUALS[index];
          return (
            <View style={{ width, height: VISUAL_HEIGHT }}>
              <Visual />
            </View>
          );
        }}
      />

      {/* Bottom content card */}
      <View style={[styles.card, { paddingBottom: Math.max(bottomInset + 44, 48) }]}>
        {/* Mascot with animated entrance per slide */}
        <Animated.View
          key={`mascot-${current}`}
          entering={FadeIn.duration(300)}
          style={styles.mascotWrap}
        >
          <MascotBuddy size={isSmall ? 58 : 66} message={slide.mascotMessage} trigger={current} />
        </Animated.View>

        {/* Slide text */}
        <Animated.View key={`text-${current}`} entering={FadeInUp.duration(300).springify()} style={styles.textWrap}>
          <Text style={styles.cardTitle} numberOfLines={2} adjustsFontSizeToFit>
            {slide.title}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={3}>{slide.subtitle}</Text>
        </Animated.View>

        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const dotWidth = useSharedValue(i === 0 ? 28 : 8);
            useEffect(() => {
              dotWidth.value = withSpring(i === current ? 28 : 8, { damping: 12 });
            }, [current]);
            const dotStyle = useAnimatedStyle(() => ({
              width: dotWidth.value,
              backgroundColor: i === current ? PURPLE : "#D1CBF5",
            }));
            return (
              <Pressable key={i} onPress={() => goToSlide(i)} hitSlop={8}>
                <Animated.View style={[styles.dot, dotStyle]} />
              </Pressable>
            );
          })}
        </View>

        {/* Next / Get Started */}
        <TouchableOpacity onPress={goNext} activeOpacity={1}>
          <Animated.View style={[styles.nextBtn, btnStyle]}>
            <Text style={styles.nextBtnText}>
              {current === SLIDES.length - 1 ? "Get Started 🚀" : "Next"}
            </Text>
            <View style={styles.nextArrow}>
              <Feather name="arrow-right" size={17} color={PURPLE} />
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// ─── Visual Styles ────────────────────────────────────────────────────────────
const vs = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  pulseRing: {
    position: "absolute", width: 120, height: 120, borderRadius: 60,
    borderWidth: 1.5,
  },
  orbitRing: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", borderStyle: "dashed",
  },
  orbitDot: { position: "absolute", width: 9, height: 9, borderRadius: 4.5, marginLeft: -4.5, marginTop: -4.5 },
  centralOuter: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center",
  },
  centralInner: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center",
  },
  statsCard: {
    position: "absolute", left: 16, bottom: 32,
    backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
  },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  statsText: { color: WHITE, fontSize: 12, fontFamily: "Inter_500Medium" },

  bellPulse: { width: 120, height: 120, alignItems: "center", justifyContent: "center", marginBottom: isSmall ? 16 : 22 },
  bellCircle: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.28)",
  },
  schedCard: {
    backgroundColor: WHITE, borderRadius: 22, paddingVertical: 2, paddingHorizontal: 14,
    width: Math.min(width * 0.78, 300),
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 8,
  },
  schedRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: isSmall ? 9 : 11 },
  schedCheck: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  schedTime: { fontSize: 11, fontFamily: "Inter_500Medium", width: 60, flexShrink: 0 },
  schedMed: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  networkNode: {
    position: "absolute", width: 52, height: 52, borderRadius: 26,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center",
  },
  centerNode: {
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  connBadge: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: isSmall ? 14 : 20,
    backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 50,
    paddingHorizontal: 16, paddingVertical: 9,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  connText: { color: WHITE, fontSize: 12, fontFamily: "Inter_500Medium" },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  decorTop: {
    position: "absolute", width: 240, height: 240, borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.04)", top: -80, right: -60,
  },
  decorMid: {
    position: "absolute", width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.03)", top: "30%", left: -30,
  },
  decorBottom: {
    position: "absolute", width: 150, height: 150, borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.03)", bottom: "35%", right: -40,
  },
  skipBtn: {
    position: "absolute", right: 20, zIndex: 10,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  skipText: { color: "rgba(255,255,255,0.82)", fontSize: 13, fontFamily: "Inter_500Medium" },

  card: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 36, borderTopRightRadius: 36,
    paddingHorizontal: 24, paddingTop: 22,
    gap: isSmall ? 14 : 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05, shadowRadius: 16, elevation: 12,
    flex: 0, // Don't flex, keep height predictable
  },
  mascotWrap: { marginTop: -8 },
  textWrap: { gap: 7, minHeight: isSmall ? 110 : 130 },
  cardTitle: {
    fontSize: isSmall ? 24 : 28,
    fontFamily: "Inter_700Bold",
    color: "#18172A",
    lineHeight: isSmall ? 30 : 36,
  },
  cardSubtitle: {
    fontSize: isSmall ? 13 : 14,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    lineHeight: 22,
  },

  dotsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { height: 8, borderRadius: 4 },

  nextBtn: {
    backgroundColor: PURPLE,
    borderRadius: 20, paddingVertical: isSmall ? 14 : 17,
    paddingLeft: 24, paddingRight: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  nextBtnText: {
    fontSize: isSmall ? 15 : 16,
    fontFamily: "Inter_700Bold",
    color: WHITE, flex: 1,
  },
  nextArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: WHITE, alignItems: "center", justifyContent: "center",
  },
});
