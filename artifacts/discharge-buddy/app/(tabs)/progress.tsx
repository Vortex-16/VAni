import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ALL_ACHIEVEMENTS, getLevel, useApp } from "@/context/AppContext";

const PINK = "#e91e8c";
const PURPLE = "#6C47FF";
const TEAL = "#0891b2";
const GOLD = "#f59e0b";
const GREEN = "#10b981";
const WHITE = "#ffffff";

function XPBar({ xp }: { xp: number }) {
  const level = getLevel(xp);
  const nextLevel = { min: level.max };
  const progress = (xp - level.min) / (level.max - level.min);
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={xpStyles.container}>
      <View style={xpStyles.row}>
        <View style={xpStyles.levelBadge}>
          <Text style={xpStyles.levelNum}>{level.level}</Text>
        </View>
        <View style={xpStyles.info}>
          <Text style={xpStyles.levelTitle}>{level.title}</Text>
          <Text style={xpStyles.xpText}>{xp} XP · {level.max - xp} XP to next level</Text>
        </View>
      </View>
      <View style={xpStyles.barBg}>
        <LinearGradient
          colors={[PINK, PURPLE]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[xpStyles.barFill, { width: `${clampedProgress * 100}%` }]}
        />
      </View>
    </View>
  );
}

const xpStyles = StyleSheet.create({
  container: { backgroundColor: WHITE, borderRadius: 20, padding: 16, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PINK,
    alignItems: "center",
    justifyContent: "center",
  },
  levelNum: { fontSize: 20, fontFamily: "Inter_700Bold", color: WHITE },
  info: { flex: 1 },
  levelTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0f172a" },
  xpText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#64748b", marginTop: 2 },
  barBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#f1f5f9",
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 5 },
});

function StreakCard({ streak }: { streak: number }) {
  const scale = useRef(new Animated.Value(1)).current;

  const pulse = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.15, useNativeDriver: true, speed: 20 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
  };

  const weeks = [
    { day: "M", active: streak >= 7 },
    { day: "T", active: streak >= 6 },
    { day: "W", active: streak >= 5 },
    { day: "T", active: streak >= 4 },
    { day: "F", active: streak >= 3 },
    { day: "S", active: streak >= 2 },
    { day: "S", active: streak >= 1 },
  ];

  return (
    <LinearGradient
      colors={["#ff6b35", "#f59e0b"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={streakStyles.card}
    >
      <View style={streakStyles.decor} />
      <TouchableOpacity onPress={pulse} activeOpacity={0.9} style={streakStyles.content}>
        <Animated.Text style={[streakStyles.fire, { transform: [{ scale }] }]}>🔥</Animated.Text>
        <Text style={streakStyles.number}>{streak}</Text>
        <Text style={streakStyles.label}>Day Streak</Text>
        <Text style={streakStyles.sub}>Tap to celebrate!</Text>
      </TouchableOpacity>
      <View style={streakStyles.weekRow}>
        {weeks.map((w, i) => (
          <View key={i} style={[streakStyles.dayDot, w.active && streakStyles.dayDotActive]}>
            <Text style={[streakStyles.dayText, w.active && streakStyles.dayTextActive]}>{w.day}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const streakStyles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    gap: 16,
    overflow: "hidden",
  },
  decor: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -50,
    right: -30,
  },
  content: { alignItems: "center", gap: 4 },
  fire: { fontSize: 52 },
  number: { fontSize: 48, fontFamily: "Inter_700Bold", color: WHITE, lineHeight: 56 },
  label: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: WHITE },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  dayDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  dayDotActive: { backgroundColor: WHITE },
  dayText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)" },
  dayTextActive: { color: "#f97316" },
});

function AdherenceCalendar({ history }: { history: { date: string; taken: number; total: number }[] }) {
  const today = new Date();
  const days: { date: string; pct: number | null }[] = [];

  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const found = history.find((h) => h.date === key);
    days.push({
      date: key,
      pct: found ? (found.total > 0 ? found.taken / found.total : null) : i === 0 ? 0.7 : null,
    });
  }

  const getColor = (pct: number | null) => {
    if (pct === null) return "#f1f5f9";
    if (pct >= 1) return GREEN;
    if (pct >= 0.75) return "#86efac";
    if (pct >= 0.5) return GOLD;
    return "#fca5a5";
  };

  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <View style={calStyles.container}>
      <Text style={calStyles.title}>Adherence Calendar</Text>
      <View style={calStyles.legend}>
        {[{ c: GREEN, l: "Perfect" }, { c: "#86efac", l: "Good" }, { c: GOLD, l: "Partial" }, { c: "#fca5a5", l: "Missed" }].map((i) => (
          <View key={i.l} style={calStyles.legendItem}>
            <View style={[calStyles.legendDot, { backgroundColor: i.c }]} />
            <Text style={calStyles.legendText}>{i.l}</Text>
          </View>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={calStyles.week}>
          {week.map((day, di) => (
            <View
              key={di}
              style={[calStyles.dot, { backgroundColor: getColor(day.pct) }]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const calStyles = StyleSheet.create({
  container: { backgroundColor: WHITE, borderRadius: 20, padding: 16, gap: 12 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0f172a" },
  legend: { flexDirection: "row", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#64748b" },
  week: { flexDirection: "row", gap: 6 },
  dot: { flex: 1, aspectRatio: 1, borderRadius: 6 },
});

function AchievementCard({ achievement, unlocked }: { achievement: typeof ALL_ACHIEVEMENTS[0]; unlocked: boolean }) {
  return (
    <View style={[achStyles.card, !unlocked && achStyles.cardLocked]}>
      <Text style={[achStyles.icon, !unlocked && achStyles.iconLocked]}>{achievement.icon}</Text>
      <View style={achStyles.info}>
        <Text style={[achStyles.title, !unlocked && achStyles.textLocked]}>{achievement.title}</Text>
        <Text style={[achStyles.desc, !unlocked && achStyles.textLocked]}>{achievement.description}</Text>
      </View>
      <View style={[achStyles.xpBadge, { backgroundColor: unlocked ? `${GOLD}20` : "#f1f5f9" }]}>
        <Text style={[achStyles.xpText, { color: unlocked ? GOLD : "#94a3b8" }]}>+{achievement.xpReward} XP</Text>
      </View>
      {unlocked && <View style={achStyles.checkDot}><Feather name="check" size={10} color={WHITE} /></View>}
    </View>
  );
}

const achStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  cardLocked: { opacity: 0.5 },
  icon: { fontSize: 28 },
  iconLocked: { opacity: 0.4 },
  info: { flex: 1 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0f172a" },
  desc: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#64748b", marginTop: 2 },
  textLocked: { color: "#94a3b8" },
  xpBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  xpText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  checkDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { streak, xp, achievements, doseHistory } = useApp();
  const topInset = Platform.OS === "web" ? 0 : insets.top;

  const unlockedIds = achievements.filter((a) => a.unlockedAt).map((a) => a.id);
  const unlockedCount = unlockedIds.length;
  const totalCount = ALL_ACHIEVEMENTS.length;

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F4FB" }}>
      <LinearGradient
        colors={["#4B26C8", PURPLE, "#8B5CF6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topInset + 20 }]}
      >
        <View style={styles.decor1} />
        <View style={styles.decor2} />
        <View style={styles.decor3} />
        <Text style={styles.headerTitle}>My Progress</Text>
        <Text style={styles.headerSub}>{unlockedCount}/{totalCount} achievements · Keep going! 💪</Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak */}
        <StreakCard streak={streak} />

        {/* XP */}
        <XPBar xp={xp} />

        {/* Calendar */}
        <AdherenceCalendar history={doseHistory} />

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements 🏆</Text>
          {ALL_ACHIEVEMENTS.map((a) => (
            <AchievementCard
              key={a.id}
              achievement={a}
              unlocked={unlockedIds.includes(a.id)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
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
  decor3: {
    position: "absolute", width: 60, height: 60, borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.06)", top: 80, left: 30,
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: WHITE },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 4 },
  list: { padding: 16, paddingBottom: 120, gap: 14 },
  section: { gap: 0 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#0f172a", marginBottom: 12 },
});
