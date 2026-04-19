import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, {
  Circle, Defs, Line, LinearGradient as SvgGradient,
  Path, Polygon, Stop, Text as SvgText,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RiskBanner } from "@/components/RiskBanner";
import { AnimPressable } from "@/components/AnimPressable";
import { SymptomLog, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const PURPLE = "#6C47FF";
const PURPLE_LIGHT = "#EDE9FE";

const COMMON_SYMPTOMS = [
  "Chest pain", "Shortness of breath", "Dizziness", "Nausea",
  "Headache", "Fatigue", "Swelling", "Fever",
  "Irregular heartbeat", "Vomiting", "Back pain", "Confusion",
];
const DANGER_SYMPTOMS = ["Chest pain", "Shortness of breath", "Irregular heartbeat", "Confusion"];

const SYMPTOM_ICONS: Record<string, string> = {
  "Chest pain": "💔",
  "Shortness of breath": "💨",
  "Dizziness": "💫",
  "Nausea": "🤢",
  "Headache": "🤕",
  "Fatigue": "😴",
  "Swelling": "🦵",
  "Fever": "🌡️",
  "Irregular heartbeat": "❤️",
  "Vomiting": "🤮",
  "Back pain": "🔴",
  "Confusion": "😵",
};


function TrendChart({ logs }: { logs: SymptomLog[] }) {
  const chartW = width - 32;
  const chartH = 130;
  const paddingLeft = 32;
  const paddingBottom = 26;
  const paddingRight = 30; // Increased to prevent labels cutting off on right
  const plotW = chartW - paddingLeft - paddingRight;
  const plotH = chartH - paddingBottom - 10;

  const days: { label: string; severity: number | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().split("T")[0];
    const dayLabel = d.toLocaleDateString("en", { weekday: "narrow" });
    const log = logs.find((l) => l.date.startsWith(key));
    days.push({ label: dayLabel, severity: log?.severity ?? null });
  }

  const hasData = days.some((d) => d.severity !== null);
  const points: { x: number; y: number }[] = [];
  days.forEach((d, i) => {
    if (d.severity !== null) {
      const x = paddingLeft + (i / 6) * plotW;
      const y = 10 + plotH - (d.severity / 10) * plotH;
      points.push({ x, y });
    }
  });

  let pathD = "";
  let polyPoints = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
    polyPoints = [`${points[0].x},${10 + plotH}`, ...points.map((p) => `${p.x},${p.y}`), `${points[points.length - 1].x},${10 + plotH}`].join(" ");
  }

  return (
    <View style={chartStyles.card}>
      <View style={chartStyles.header}>
        <View>
          <Text style={chartStyles.title}>Symptom Trend</Text>
          <Text style={chartStyles.sub}>Last 7 days</Text>
        </View>
        {hasData && (
          <View style={chartStyles.badge}>
            <Text style={chartStyles.badgeText}>Tracked</Text>
          </View>
        )}
      </View>
      {!hasData ? (
        <View style={chartStyles.empty}>
          <Text style={{ fontSize: 28 }}>📊</Text>
          <Text style={chartStyles.emptyText}>Log symptoms to see your trend</Text>
        </View>
      ) : (
        <Svg width={chartW} height={chartH}>
          <Defs>
            <SvgGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={PURPLE} stopOpacity="0.3" />
              <Stop offset="1" stopColor={PURPLE} stopOpacity="0.02" />
            </SvgGradient>
          </Defs>
          {[2, 5, 8].map((v) => {
            const y = 10 + plotH - (v / 10) * plotH;
            return (
              <Line key={v} x1={paddingLeft} y1={y} x2={chartW - paddingRight} y2={y} stroke="#E8E4FF" strokeWidth={1} />
            );
          })}
          {[2, 5, 8].map((v) => {
            const y = 10 + plotH - (v / 10) * plotH;
            return (
              <SvgText key={v} x={paddingLeft - 4} y={y + 4} textAnchor="end" fill="#9CA3AF" fontSize="9">{v}</SvgText>
            );
          })}
          {points.length > 1 && <Polygon points={polyPoints} fill="url(#grad)" />}
          {points.length > 1 && <Path d={pathD} stroke={PURPLE} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={5} fill={PURPLE} stroke="#fff" strokeWidth={2} />
          ))}
          {days.map((d, i) => {
            const x = paddingLeft + (i / 6) * plotW;
            return (
              <SvgText key={i} x={x} y={chartH - 4} textAnchor="middle" fill="#9CA3AF" fontSize="10">{d.label}</SvgText>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  card: {
    backgroundColor: "#fff", borderRadius: 24, padding: 18, marginBottom: 16, gap: 12,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#1E1B4B" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#9CA3AF", marginTop: 2 },
  badge: { backgroundColor: PURPLE_LIGHT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: PURPLE },
  empty: { height: 90, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#9CA3AF" },
});

export default function SymptomsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { symptomLogs, addSymptomLog } = useApp();
  const [selected, setSelected] = useState<string[]>([]);
  const [severity, setSeverity] = useState(3);
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const toggleSymptom = (s: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const getRisk = (): SymptomLog["riskLevel"] => {
    const hasDanger = selected.some((s) => DANGER_SYMPTOMS.includes(s));
    if (hasDanger || severity >= 8) return "high";
    if (severity >= 5) return "medium";
    return "low";
  };

  const handleSubmit = () => {
    if (selected.length === 0) {
      Alert.alert("Select Symptoms", "Please select at least one symptom.");
      return;
    }
    const risk = getRisk();
    const log: SymptomLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      symptoms: selected,
      severity,
      notes,
      riskLevel: risk,
    };
    addSymptomLog(log);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (risk === "high") {
      Alert.alert("⚠️ High Risk", "Your symptoms may require immediate attention. Your caregiver has been notified.", [{ text: "OK" }]);
    }
    setSelected([]); setSeverity(3); setNotes(""); setShowForm(false);
  };

  const severityColor = severity >= 8 ? "#EF4444" : severity >= 5 ? "#F59E0B" : "#10B981";

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F4FB" }}>
      {/* Header */}
      <LinearGradient
        colors={["#4B26C8", PURPLE, "#8B5CF6"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topInset + 20 }]}
      >
        <View style={styles.decor1} />
        <View style={styles.decor2} />
        <View style={styles.decor3} />
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 22 }}>🩺</Text>
              <Text style={styles.headerTitle}>Symptoms</Text>
            </View>
            <Text style={styles.headerSub}>{symptomLogs.length} logs · Track your recovery</Text>
          </View>
          {!showForm ? (
            <AnimPressable onPress={() => setShowForm(true)} style={styles.logBtn}>
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.logBtnText}>Log Today</Text>
            </AnimPressable>
          ) : (
            <TouchableOpacity onPress={() => setShowForm(false)} style={styles.closeBtn}>
              <Feather name="x" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {showForm ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Severity preview */}
          <View style={[styles.severityPreview, { backgroundColor: `${severityColor}12`, borderColor: `${severityColor}30` }]}>
            <Text style={{ fontSize: 32 }}>{severity >= 8 ? "🚨" : severity >= 5 ? "⚠️" : "✅"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.severityPreviewTitle, { color: severityColor }]}>
                Severity {severity}/10 — {severity >= 8 ? "High Risk" : severity >= 5 ? "Moderate" : "Low Risk"}
              </Text>
              <Text style={styles.severityPreviewSub}>
                {severity >= 8 ? "Please contact your doctor" : severity >= 5 ? "Monitor closely" : "Feeling manageable"}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Select Symptoms</Text>
          <View style={styles.symptomsGrid}>
            {COMMON_SYMPTOMS.map((s) => {
              const isSel = selected.includes(s);
              const isDanger = DANGER_SYMPTOMS.includes(s);
              return (
                <AnimPressable key={s} onPress={() => toggleSymptom(s)}
                  style={[styles.chip, {
                    backgroundColor: isSel ? (isDanger ? "#FEF2F2" : PURPLE_LIGHT) : "#fff",
                    borderColor: isSel ? (isDanger ? "#EF4444" : PURPLE) : "#E8E4FF",
                  }]}
                >
                  <Text style={{ fontSize: 16 }}>{SYMPTOM_ICONS[s] ?? "•"}</Text>
                  <Text style={[styles.chipText, { color: isSel ? (isDanger ? "#EF4444" : PURPLE) : "#4B5563" }]}>
                    {s}
                  </Text>
                </AnimPressable>
              );
            })}
          </View>

          {selected.some((s) => DANGER_SYMPTOMS.includes(s)) && (
            <RiskBanner level="high" message="You've selected a danger symptom. Please contact your doctor or use the emergency button." />
          )}

          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Severity (1–10)</Text>
          <View style={styles.severityRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
              const c = n >= 8 ? "#EF4444" : n >= 5 ? "#F59E0B" : "#10B981";
              const active = severity >= n;
              return (
                <AnimPressable key={n} onPress={() => setSeverity(n)}
                  style={[styles.sevBtn, {
                    backgroundColor: active ? c : "#F3F0FF",
                    borderColor: severity === n ? c : "#E8E4FF",
                  }]}
                >
                  <Text style={[styles.sevBtnText, { color: active ? "#fff" : "#9CA3AF" }]}>{n}</Text>
                </AnimPressable>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Additional Notes</Text>
          <TextInput
            value={notes} onChangeText={setNotes}
            placeholder="Describe how you feel..."
            placeholderTextColor="#9CA3AF"
            multiline numberOfLines={3}
            style={styles.notesInput}
          />

          <View style={styles.formActions}>
            <TouchableOpacity onPress={() => setShowForm(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <AnimPressable onPress={handleSubmit} style={styles.submitBtn}>
              <Feather name="check" size={18} color="#fff" />
              <Text style={styles.submitText}>Submit +15 XP</Text>
            </AnimPressable>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
        >
          <TrendChart logs={symptomLogs} />

          {symptomLogs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 52 }}>📊</Text>
              <Text style={styles.emptyTitle}>No Symptoms Logged</Text>
              <Text style={styles.emptySub}>Tap "Log Today" to record your first symptom</Text>
              <AnimPressable onPress={() => setShowForm(true)} style={styles.startBtn}>
                <Feather name="plus" size={18} color="#fff" />
                <Text style={styles.startBtnText}>Log First Symptom</Text>
              </AnimPressable>
            </View>
          ) : (
            symptomLogs.map((log) => {
              const riskColor = log.riskLevel === "high" ? "#EF4444" : log.riskLevel === "medium" ? "#F59E0B" : "#10B981";
              const riskEmoji = log.riskLevel === "high" ? "🚨" : log.riskLevel === "medium" ? "⚠️" : "✅";
              return (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logCardHeader}>
                    <Text style={styles.logDate}>
                      {new Date(log.date).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    <View style={[styles.riskBadge, { backgroundColor: `${riskColor}15` }]}>
                      <Text style={[styles.riskText, { color: riskColor }]}>{riskEmoji} {log.riskLevel.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.symptomsList}>
                    {log.symptoms.map((s) => (
                      <View key={s} style={styles.symptomTag}>
                        <Text style={{ fontSize: 11 }}>{SYMPTOM_ICONS[s] ?? "•"}</Text>
                        <Text style={styles.symptomTagText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.sevBarRow}>
                    <Text style={styles.sevLabel}>Severity</Text>
                    <View style={styles.sevMini}>
                      {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                        <View key={n} style={[styles.sevDot, {
                          backgroundColor: n <= log.severity
                            ? (log.severity >= 8 ? "#EF4444" : log.severity >= 5 ? "#F59E0B" : "#10B981")
                            : "#E8E4FF",
                        }]} />
                      ))}
                    </View>
                    <Text style={styles.sevNum} numberOfLines={1}>{log.severity}/10</Text>
                  </View>
                  {log.notes ? <Text style={styles.noteText}>"{log.notes}"</Text> : null}
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
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  headerEmoji: { fontSize: 22, marginBottom: 4 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 2 },
  logBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 50,
  },
  logBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center",
  },

  severityPreview: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 20, borderWidth: 1.5, marginBottom: 20,
  },
  severityPreviewTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  severityPreviewSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280", marginTop: 4 },

  sectionLabel: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#1E1B4B", marginBottom: 12 },
  symptomsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 50, borderWidth: 1.5,
  },
  chipText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  severityRow: { flexDirection: "row", gap: 6 },
  sevBtn: { flex: 1, aspectRatio: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  sevBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },

  notesInput: {
    borderWidth: 1.5, borderColor: "#E8E4FF", borderRadius: 18, padding: 16,
    fontSize: 16, fontFamily: "Inter_400Regular", minHeight: 90,
    textAlignVertical: "top", backgroundColor: "#fff", color: "#1E1B4B",
  },
  formActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 18, alignItems: "center",
    borderWidth: 1.5, borderColor: "#E8E4FF", backgroundColor: "#fff",
  },
  cancelText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#6B7280" },
  submitBtn: {
    flex: 2, flexDirection: "row", gap: 8, paddingVertical: 16,
    borderRadius: 18, alignItems: "center", justifyContent: "center",
    backgroundColor: PURPLE,
  },
  submitText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },

  empty: { alignItems: "center", paddingTop: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#1E1B4B" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#9CA3AF", textAlign: "center" },
  startBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: PURPLE, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 50, marginTop: 8,
  },
  startBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },

  logCard: {
    backgroundColor: "#fff", borderRadius: 24, padding: 18,
    marginBottom: 12, gap: 12,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  logCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logDate: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#1E1B4B" },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  riskText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  symptomsList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  symptomTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#F3F0FF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  symptomTagText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: PURPLE },
  sevBarRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  sevLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#6B7280" },
  sevMini: { flex: 1, flexDirection: "row", gap: 2, marginHorizontal: 4 },
  sevDot: { flex: 1, height: 6, borderRadius: 3 },
  sevNum: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#1E1B4B", width: 40, textAlign: "right" },
  noteText: { fontSize: 14, fontFamily: "Inter_400Regular", fontStyle: "italic", color: "#6B7280" },
});
