import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { JournalEntry, useApp } from "@/context/AppContext";
import { AnimPressable } from "@/components/AnimPressable";

const PURPLE = "#6C47FF";
const PINK = "#e91e8c";
const WHITE = "#ffffff";

const MOODS = [
  { emoji: "😞", label: "Rough", value: 1, color: "#ef4444" },
  { emoji: "😕", label: "Low", value: 2, color: "#f97316" },
  { emoji: "😐", label: "Okay", value: 3, color: "#f59e0b" },
  { emoji: "🙂", label: "Good", value: 4, color: "#10b981" },
  { emoji: "😄", label: "Great", value: 5, color: "#0891b2" },
];

const ENERGY_LEVELS = [
  { emoji: "🪫", label: "Drained", value: 1 },
  { emoji: "😴", label: "Tired", value: 2 },
  { emoji: "🙂", label: "Normal", value: 3 },
  { emoji: "⚡", label: "Energized", value: 4 },
  { emoji: "🚀", label: "Amazing", value: 5 },
];

const PROMPTS = [
  "How are you feeling about your recovery today?",
  "What's one thing that went well today?",
  "Did you notice any changes in your body?",
  "What would make tomorrow better?",
  "Describe your energy levels today.",
];

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { addJournalEntry, journalEntries } = useApp();
  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const [showForm, setShowForm] = useState(false);
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [text, setText] = useState("");
  const prompt = PROMPTS[new Date().getDay() % PROMPTS.length];

  const handleSave = () => {
    if (!text.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const entry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      mood,
      energy,
      text: text.trim(),
    };
    addJournalEntry(entry);
    setText("");
    setMood(3);
    setEnergy(3);
    setShowForm(false);
  };

  const moodCfg = MOODS.find((m) => m.value === mood) ?? MOODS[2];

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F4FB" }}>
      {/* Header */}
      <LinearGradient
        colors={["#4B26C8", PURPLE, "#8B5CF6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topInset + 20 }]}
      >
        <View style={styles.decor1} />
        <View style={styles.decor2} />
        <View style={styles.decor3} />
        <AnimPressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={WHITE} />
        </AnimPressable>
        <Text style={styles.headerTitle}>Recovery Journal</Text>
        <Text style={styles.headerSub}>Your daily reflections</Text>
      </LinearGradient>

      {showForm ? (
        <ScrollView
          contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Check-in</Text>
            <Text style={styles.promptText}>"{prompt}"</Text>

            {/* Mood */}
            <Text style={styles.label}>How do you feel?</Text>
            <View style={styles.emojiRow}>
              {MOODS.map((m) => (
                <AnimPressable
                  key={m.value}
                  onPress={() => { setMood(m.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.emojiBtn, mood === m.value && { backgroundColor: `${m.color}20`, borderColor: m.color }]}
                >
                  <Text style={styles.emojiChar}>{m.emoji}</Text>
                  <Text style={[styles.emojiLabel, { color: mood === m.value ? m.color : "#94a3b8" }]}>{m.label}</Text>
                </AnimPressable>
              ))}
            </View>

            {/* Energy */}
            <Text style={styles.label}>Energy level?</Text>
            <View style={styles.emojiRow}>
              {ENERGY_LEVELS.map((e) => (
                <AnimPressable
                  key={e.value}
                  onPress={() => { setEnergy(e.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.emojiBtn, energy === e.value && { backgroundColor: `${PURPLE}20`, borderColor: PURPLE }]}
                >
                  <Text style={styles.emojiChar}>{e.emoji}</Text>
                  <Text style={[styles.emojiLabel, { color: energy === e.value ? PURPLE : "#94a3b8" }]}>{e.label}</Text>
                </AnimPressable>
              ))}
            </View>

            {/* Text */}
            <Text style={styles.label}>Write your thoughts</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={prompt}
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={5}
              style={styles.textArea}
              textAlignVertical="top"
            />

            <AnimPressable onPress={handleSave}>
              <LinearGradient
                colors={[PURPLE, PINK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtn}
              >
                <Feather name="save" size={16} color={WHITE} />
                <Text style={styles.saveBtnText}>Save Entry  +20 XP</Text>
              </LinearGradient>
            </AnimPressable>

            <AnimPressable onPress={() => setShowForm(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </AnimPressable>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Write today's entry CTA */}
          <AnimPressable onPress={() => setShowForm(true)}>
            <LinearGradient
              colors={[`${PURPLE}15`, `${PINK}15`]}
              style={styles.ctaCard}
            >
              <Text style={styles.ctaEmoji}>📝</Text>
              <View style={styles.ctaText}>
                <Text style={styles.ctaTitle}>Write Today's Entry</Text>
                <Text style={styles.ctaSub}>Earn 20 XP for journaling</Text>
              </View>
              <View style={styles.ctaChevron}>
                <Feather name="chevron-right" size={20} color={PURPLE} />
              </View>
            </LinearGradient>
          </AnimPressable>

          {/* Previous entries */}
          {journalEntries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📖</Text>
              <Text style={styles.emptyTitle}>Your journal is empty</Text>
              <Text style={styles.emptySub}>Start writing to track your recovery journey</Text>
            </View>
          ) : (
            journalEntries.map((entry) => {
              const moodEntry = MOODS.find((m) => m.value === entry.mood) ?? MOODS[2];
              const energyEntry = ENERGY_LEVELS.find((e) => e.value === entry.energy) ?? ENERGY_LEVELS[2];
              return (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryDate}>
                      {new Date(entry.date).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
                    </Text>
                    <View style={styles.entryBadges}>
                      <Text style={styles.entryBadge}>{moodEntry.emoji} {moodEntry.label}</Text>
                      <Text style={styles.entryBadge}>{energyEntry.emoji} {energyEntry.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.entryText} numberOfLines={3}>{entry.text}</Text>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
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
  decor3: {
    position: "absolute", width: 60, height: 60, borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.06)", top: 80, left: 30,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: WHITE },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },

  formContent: { padding: 16, paddingBottom: 120 },
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  cardTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#0f172a" },
  promptText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
    fontStyle: "italic",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: PURPLE,
  },
  label: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#0f172a" },
  emojiRow: { flexDirection: "row", gap: 6 },
  emojiBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    gap: 4,
  },
  emojiChar: { fontSize: 26 },
  emojiLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  textArea: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    padding: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#0f172a",
    minHeight: 120,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 50,
  },
  saveBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: WHITE },
  cancelBtn: { alignItems: "center", paddingVertical: 10 },
  cancelText: { fontSize: 16, fontFamily: "Inter_500Medium", color: "#94a3b8" },

  listContent: { padding: 16, paddingBottom: 120, gap: 12 },
  ctaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: `${PURPLE}30`,
  },
  ctaEmoji: { fontSize: 36 },
  ctaText: { flex: 1 },
  ctaTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#0f172a" },
  ctaSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#64748b", marginTop: 2 },
  ctaChevron: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: `${PURPLE}15`, alignItems: "center", justifyContent: "center",
  },

  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#1e293b" },
  emptySub: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#94a3b8", textAlign: "center" },

  entryCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  entryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  entryDate: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#0f172a" },
  entryBadges: { flexDirection: "row", gap: 6 },
  entryBadge: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#64748b" },
  entryText: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#64748b", lineHeight: 22 },
});
