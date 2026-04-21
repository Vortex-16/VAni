import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
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

import { MedicineCard } from "@/components/MedicineCard";
import { AnimPressable } from "@/components/AnimPressable";
import { MascotBuddy } from "@/components/MascotBuddy";
import { Medicine, useApp } from "@/context/AppContext";

const PURPLE = "#6C47FF";
const PURPLE_LIGHT = "#EDE9FE";
const WHITE = "#FFFFFF";

const TIME_SLOTS: { label: string; range: [string, string]; icon: any; color: string; emoji: string }[] = [
  { label: "Morning", range: ["06:00", "12:00"], icon: "sun", color: "#F59E0B", emoji: "🌅" },
  { label: "Afternoon", range: ["12:00", "17:00"], icon: "cloud", color: "#06B6D4", emoji: "☀️" },
  { label: "Evening", range: ["17:00", "21:00"], icon: "sunset", color: "#F97316", emoji: "🌆" },
  { label: "Night", range: ["21:00", "24:00"], icon: "moon", color: "#8B5CF6", emoji: "🌙" },
];

function computeRefillDays(med: Medicine): number {
  const dosesPerDay = med.times.length;
  const pills = med.totalPills ?? 30;
  const daysSinceStart = Math.floor((Date.now() - new Date(med.startDate).getTime()) / (1000 * 60 * 60 * 24));
  const usedPills = daysSinceStart * dosesPerDay;
  const remaining = Math.max(0, pills - usedPills);
  return Math.floor(remaining / dosesPerDay);
}

function AnimatedTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <AnimPressable onPress={onPress} style={[tabStyles.btn, active && tabStyles.btnActive]}>
      <Text style={[tabStyles.text, active && tabStyles.textActive]}>{label}</Text>
    </AnimPressable>
  );
}

const tabStyles = StyleSheet.create({
  btn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 50 },
  btnActive: { backgroundColor: WHITE },
  text: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.75)" },
  textActive: { color: PURPLE },
});

function RefillCard({ med }: { med: Medicine }) {
  const days = computeRefillDays(med);
  const total = med.totalPills ?? 30;
  const usedPct = Math.min(1, Math.max(0, 1 - (days * med.times.length) / total));
  const color = days <= 7 ? "#EF4444" : days <= 14 ? "#F59E0B" : "#10B981";

  return (
    <AnimPressable onPress={() => { }} style={rfStyles.card}>
      <View style={rfStyles.row}>
        <View style={[rfStyles.colorBar, { backgroundColor: med.color }]} />
        <View style={rfStyles.info}>
          <Text style={rfStyles.name}>{med.name}</Text>
          <Text style={rfStyles.dosage}>{med.dosage} · {med.frequency}</Text>
        </View>
        <View style={[rfStyles.badge, { backgroundColor: `${color}15` }]}>
          <Feather name="refresh-cw" size={11} color={color} />
          <Text style={[rfStyles.badgeText, { color }]}>
            {days <= 0 ? "Refill!" : `${days}d`}
          </Text>
        </View>
      </View>
      <View style={rfStyles.barBg}>
        <Animated.View style={[rfStyles.barFill, { width: `${usedPct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={rfStyles.barLabel}>{days > 0 ? `${days} days of supply remaining` : "Needs refill now"}</Text>
    </AnimPressable>
  );
}

const rfStyles = StyleSheet.create({
  card: {
    backgroundColor: WHITE, borderRadius: 20, padding: 16, gap: 12,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  colorBar: { width: 5, height: 40, borderRadius: 3 },
  info: { flex: 1 },
  name: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#1E1B4B" },
  dosage: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280", marginTop: 2 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  badgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  barBg: { height: 8, borderRadius: 4, backgroundColor: "#F3F0FF", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  barLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#9CA3AF" },
});

export default function MedicinesScreen() {
  const insets = useSafeAreaInsets();
  const { medicines, todayDoses, updateDoseStatus, drugInteractions, addMedicine } = useApp();
  const [activeTab, setActiveTab] = useState<"today" | "all" | "refills">("today");
  const [mascotTrigger, setMascotTrigger] = useState(0);
  const topInset = Platform.OS === "web" ? 0 : insets.top;

  const getDosesForSlot = (range: [string, string]) =>
    todayDoses.filter((dose) => {
      const [h, m] = dose.scheduledTime.split(":").map(Number);
      const t = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      return t >= range[0] && t < range[1];
    });

  const takenCount = todayDoses.filter((d) => d.status === "taken").length;
  const totalCount = todayDoses.length;
  const progressPct = totalCount > 0 ? takenCount / totalCount : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F4FB" }}>
      <LinearGradient
        colors={["#4B26C8", PURPLE, "#8B5CF6"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topInset + 24 }]}
      >
        <View style={styles.decor1} />
        <View style={styles.decor2} />
        <View style={styles.decor3} />
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
              {/* <Text style={{ fontSize: 26 }}>💊</Text> */}
              <Text style={styles.headerTitle}>My Medicines</Text>
            </View>
            <Text style={styles.headerSub}>{takenCount} of {totalCount} taken today</Text>
          </View>
          <AnimPressable
            onPress={() => router.push("/scan")}
            style={styles.scanBtn}
          >
            <Feather name="camera" size={20} color={PURPLE} />
          </AnimPressable>
        </View>

        {/* Mascot for feedback */}
        <View style={{ marginTop: 10, width: '100%' }}>
          <MascotBuddy size={70} trigger={mascotTrigger} />
        </View>

        {/* Progress bar */}
        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
          </View>
          <Text style={styles.progressPct}>{Math.round(progressPct * 100)}%</Text>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabWrap}>
          {(["today", "all", "refills"] as const).map((tab) => (
            <AnimatedTab
              key={tab}
              label={tab === "today" ? "Today" : tab === "all" ? "All Meds" : "Refills"}
              active={activeTab === tab}
              onPress={() => setActiveTab(tab)}
            />
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "today" ? (
          totalCount === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 52, marginBottom: 8 }}>✅</Text>
              <Text style={styles.emptyTitle}>All clear today!</Text>
              <Text style={styles.emptySub}>No doses scheduled yet</Text>
            </View>
          ) : (
            TIME_SLOTS.map((slot) => {
              const doses = getDosesForSlot(slot.range);
              if (doses.length === 0) return null;
              const slotTaken = doses.filter((d) => d.status === "taken").length;
              return (
                <View key={slot.label} style={styles.slotSection}>
                  <View style={styles.slotHeader}>
                    <View style={[styles.slotIconWrap, { backgroundColor: `${slot.color}18` }]}>
                      <Text style={{ fontSize: 16 }}>{slot.emoji}</Text>
                    </View>
                    <Text style={styles.slotLabel}>{slot.label}</Text>
                    <View style={[styles.slotBadge, { backgroundColor: `${slot.color}15` }]}>
                      <Text style={[styles.slotBadgeText, { color: slot.color }]}>{slotTaken}/{doses.length}</Text>
                    </View>
                  </View>
                  {doses.map((dose) => {
                    const med = medicines.find((m) => m.id === dose.medicineId);
                    if (!med) return null;
                    return (
                      <MedicineCard
                        key={dose.id}
                        medicine={med}
                        dose={dose}
                        onTake={(id) => {
                          updateDoseStatus(id, "taken");
                          setMascotTrigger(prev => prev + 1);
                        }}
                        onSnooze={(id) => updateDoseStatus(id, "snoozed")}
                      />
                    );
                  })}
                </View>
              );
            })
          )
        ) : activeTab === "refills" ? (
          <View style={styles.refillSection}>
            <View style={styles.refillHeader}>
              <Text style={{ fontSize: 28 }}>💊</Text>
              <View>
                <Text style={styles.refillTitle}>Refill Tracker</Text>
                <Text style={styles.refillSub}>Monitor your medication supply</Text>
              </View>
            </View>
            {medicines.map((med) => <RefillCard key={med.id} med={med} />)}
          </View>
        ) : medicines.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 52, marginBottom: 8 }}>📋</Text>
            <Text style={styles.emptyTitle}>No medicines yet</Text>
            <Text style={styles.emptySub}>Scan a prescription to get started</Text>
            <TouchableOpacity
              onPress={() => router.push("/scan")}
              style={styles.emptyBtn}
              activeOpacity={0.85}
            >
              <Feather name="camera" size={16} color={WHITE} />
              <Text style={styles.emptyBtnText}>Scan Prescription</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => addMedicine({
                id: Date.now().toString(),
                name: "Tylenol",
                dosage: "500mg",
                frequency: "Daily",
                times: ["09:00", "21:00"],
                instructions: "Take with food",
                simplifiedInstructions: "Take with food",
                startDate: new Date().toISOString(),
                color: "#ff6b35"
              })}
              style={[styles.emptyBtn, { backgroundColor: WHITE, borderWidth: 1, borderColor: PURPLE, marginTop: 8 }]}
              activeOpacity={0.85}
            >
              <Feather name="edit-3" size={16} color={PURPLE} />
              <Text style={[styles.emptyBtnText, { color: PURPLE }]}>Add Manually (Demo)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.allGrid}>
            {medicines.map((med) => <MedicineCard key={med.id} medicine={med} compact />)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20, paddingBottom: 24,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
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
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 },
  headerEmoji: { fontSize: 28, marginBottom: 4 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: WHITE },
  headerSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 2 },
  scanBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: WHITE, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  progressBg: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.22)", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: WHITE },
  progressPct: { fontSize: 14, fontFamily: "Inter_700Bold", color: WHITE, width: 40, textAlign: "right" },
  tabWrap: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 50, padding: 5,
  },

  list: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120, gap: 8 },
  slotSection: { marginBottom: 8 },
  slotHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginBottom: 12, marginTop: 6,
  },
  slotIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  slotLabel: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#1E1B4B", flex: 1 },
  slotBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  slotBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },

  allGrid: { gap: 2 },
  refillSection: { gap: 14 },
  refillHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 4 },
  refillTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#1E1B4B" },
  refillSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#6B7280", marginTop: 2 },

  empty: { alignItems: "center", paddingTop: 64, gap: 10 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#1E1B4B" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#9CA3AF" },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: PURPLE, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 50, marginTop: 12,
  },
  emptyBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE },
});
