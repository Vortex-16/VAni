import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, G, Rect, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@/constants/translations";

import { MascotBuddy } from "@/components/MascotBuddy";
import { AnimPressable } from "@/components/AnimPressable";
import colors from "@/constants/colors";
import { getLevel, useApp } from "@/context/AppContext";
import { useSidebar } from "@/context/SidebarContext";

const { width } = Dimensions.get("window");
const theme = colors.light;
const PURPLE = "#6C47FF";
const PURPLE_LIGHT = "#EDE9FE";

// Responsive helpers
const edgePad = Math.min(width * 0.05, 20);
const isSmall = width < 360;


// ─── Circular Progress ───────────────────────────────────────────────────────
function CircularProgress({ pct, size = 96 }: { pct: number; size?: number }) {
  const stroke = 9;
  const r = (size - stroke * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  // Animated progress
  const animPct = useRef(new Animated.Value(0)).current;
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    Animated.timing(animPct, {
      toValue: pct,
      duration: 900,
      useNativeDriver: false,
    }).start();
    animPct.addListener(({ value }) => setDisplayPct(Math.round(value)));
    return () => animPct.removeAllListeners();
  }, [pct]);

  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.2)" strokeWidth={stroke} fill="none" />
      <Circle
        cx={cx} cy={cy} r={r}
        stroke="#ffffff"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${cx},${cy}`}
      />
      <SvgText
        x={cx} y={cy - 5}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={isSmall ? "20" : "22"}
        fontFamily="Inter_700Bold"
      >
        {displayPct}%
      </SvgText>
      <SvgText
        x={cx} y={cy + 13}
        textAnchor="middle"
        fill="rgba(255,255,255,0.75)"
        fontSize="9"
        fontFamily="Inter_500Medium"
      >
        adherence
      </SvgText>
    </Svg>
  );
}

// ─── Weekly Bars ─────────────────────────────────────────────────────────────
function WeeklyBars({ taken = 0, total = 0 }: { taken: number; total: number }) {
  const today = new Date();
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const todayIdx = (today.getDay() + 6) % 7;

  const chartW = width - edgePad * 2 - 32; // full inner width
  const barW = Math.min(22, (chartW - 6 * 8) / 7); // dynamic bar width
  const barH = isSmall ? 52 : 60;
  const gap = (chartW - days.length * barW) / (days.length - 1);

  const baseData = [92, 100, 75, 90, 100, 85, 0];
  const todayPct = total > 0 ? (taken / total) * 100 : 0;
  const vals = baseData.map((v, i) => (i === todayIdx ? todayPct : i < todayIdx ? v : 0));

  return (
    <Svg width={chartW} height={barH + 22} viewBox={`0 0 ${chartW} ${barH + 22}`}>
      {days.map((d, i) => {
        const pct = vals[i] / 100;
        const h = Math.max(4, Math.round(pct * barH));
        const x = i * (barW + gap);
        const y = barH - h;
        const isToday = i === todayIdx;
        return (
          <G key={i}>
            <Rect x={x} y={0} width={barW} height={barH} rx={barW / 2} ry={barW / 2} fill="rgba(255,255,255,0.12)" />
            {pct > 0 && (
              <Rect x={x} y={y} width={barW} height={h} rx={barW / 2} ry={barW / 2}
                fill={isToday ? "#fff" : "rgba(255,255,255,0.6)"} />
            )}
            <SvgText
              x={x + barW / 2} y={barH + 17}
              textAnchor="middle"
              fill={isToday ? "#fff" : "rgba(255,255,255,0.55)"}
              fontSize={isSmall ? "9" : "10"}
              fontWeight={isToday ? "700" : "500"}
            >{d}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────
function StatChip({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <View style={[styles.statChip, { backgroundColor: `${color}22` }]}>
      <Text style={[styles.statChipNum, { color: "#fff" }]}>{count}</Text>
      <Text style={[styles.statChipLbl, { color: "rgba(255,255,255,0.7)" }]}>{label}</Text>
    </View>
  );
}

// ─── Quick Action ─────────────────────────────────────────────────────────────
function QuickAction({ icon, label, color, onPress, delay = 0 }: { icon: any; label: string; color: string; onPress: () => void; delay?: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 100, friction: 8, delay } as any),
    ]).start();
  }, []);

  return (
    <TouchableOpacity
      style={styles.quickItem}
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, friction: 8 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start()}
      activeOpacity={1}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale }, { translateY: slideAnim }], alignItems: "center" }}>
        <View style={[styles.quickCircle, { backgroundColor: `${color}12`, borderColor: `${color}24` }]}>
          <Feather name={icon} size={isSmall ? 20 : 22} color={color} />
        </View>
        <Text style={styles.quickLabel} numberOfLines={1}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { role } = useApp();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  if (role === "caregiver") return <CaregiverDashboard topInset={topInset} />;
  return <PatientDashboard topInset={topInset} />;
}

// ─── Patient Dashboard ────────────────────────────────────────────────────────
function PatientDashboard({ topInset }: { topInset: number }) {
  const { user, todayDoses, medicines, followUps, updateDoseStatus, language } = useApp();
  const { open: openSidebar } = useSidebar();
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const taken = todayDoses.filter((d) => d.status === "taken").length;
  const total = todayDoses.length;
  const missed = todayDoses.filter((d) => d.status === "missed").length;
  const pending = todayDoses.filter((d) => d.status === "pending").length;
  const adherencePct = total > 0 ? Math.round((taken / total) * 100) : 0;
  const upcomingFollowUp = followUps.find((f) => !f.completed);
  const [showAll, setShowAll] = useState(false);
  const [mascotTrigger, setMascotTrigger] = useState(0);

  // Hero fade in
  const heroFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(heroFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const recentActivity = todayDoses
    .slice(0, showAll ? undefined : 4)
    .map((dose) => ({ dose, med: medicines.find((m) => m.id === dose.medicineId) }));

  const riskColor = missed >= 2 ? "#EF4444" : missed === 1 ? "#F59E0B" : "#22C55E";
  const riskLabel = missed >= 2 ? "High Risk" : missed === 1 ? "Moderate" : "On Track";
  const firstName = (user?.name ?? "Friend").split(" ")[0];
  const greetHour = new Date().getHours();
  const greetKey = greetHour < 12 ? "morning" : greetHour < 17 ? "afternoon" : greetHour < 21 ? "evening" : "night";
  const greet = t(greetKey, language);
  return (
    <View style={{ flex: 1, backgroundColor: "#F5F4FB" }}>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
      >
        {/* ── Hero Header ── */}
        <LinearGradient
          colors={["#4B26C8", PURPLE, "#8B5CF6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerBg, { paddingTop: topInset + 14 }]}
        >
          {/* Decorative blobs */}
          <View style={styles.decor1} />
          <View style={styles.decor2} />
          <View style={styles.decor3} />

          {/* Top bar */}
          <Animated.View style={[styles.headerTop, { opacity: heroFade }]}>
            <AnimPressable onPress={openSidebar} style={styles.iconBtn}>
              <Feather name="menu" size={21} color="#fff" />
            </AnimPressable>
            <View style={styles.greetBlock}>
              <Text style={styles.greetText} numberOfLines={1}>{greet}</Text>
              <Text style={styles.nameText} numberOfLines={1}>{firstName} 👋</Text>
            </View>
            <AnimPressable onPress={() => router.push("/notifications")} style={styles.iconBtn}>
              <Feather name="bell" size={19} color="#fff" />
              <View style={styles.notifDot} />
            </AnimPressable>
          </Animated.View>

          {/* Mascot */}
          <MascotBuddy size={isSmall ? 76 : 84} trigger={mascotTrigger} />

          {/* ── Stats Block ── responsive two-row layout */}
          <View style={styles.statsBlock}>
            {/* Row 1: Ring + Dose count */}
            <View style={styles.statsRow1}>
              <View style={styles.ringWrap}>
                <CircularProgress pct={adherencePct} size={isSmall ? 88 : 96} />
              </View>
              <View style={styles.dosesBlock}>
                <View style={[styles.riskBadge, { backgroundColor: `${riskColor}25` }]}>
                  <View style={[styles.riskDot, { backgroundColor: riskColor }]} />
                  <Text style={styles.riskText}>{riskLabel}</Text>
                </View>
                <Text style={styles.dosesMain} numberOfLines={1} adjustsFontSizeToFit>
                  {taken}/{total}
                </Text>
                <Text style={styles.dosesLabel}>{t("takenToday", language)}</Text>
              </View>
            </View>

            {/* Row 2: Missed + Pending chips */}
            <View style={styles.statsRow2}>
              <StatChip count={missed} label="missed" color="#EF4444" />
              <View style={styles.statsDivider} />
              <StatChip count={pending} label="pending" color="#F59E0B" />
              <View style={styles.statsDivider} />
              <StatChip count={taken} label="taken" color="#22C55E" />
            </View>
          </View>

          {/* ── Weekly chart ── */}
          <View style={styles.weeklyWrap}>
            <View style={styles.weeklyHeader}>
              <Feather name="bar-chart-2" size={13} color="rgba(255,255,255,0.65)" />
              <Text style={styles.weeklyLabel}>This Week</Text>
            </View>
            <WeeklyBars taken={taken} total={total} />
          </View>
        </LinearGradient>

        {/* ── Quick Actions ── */}
        <View style={styles.quickSection}>
          <Text style={styles.sectionTitle}>{t("reminders", language)}</Text>
          <View style={styles.quickRow}>
            <QuickAction icon="activity" label="Symptoms" color="#EF4444" delay={0}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/symptoms" as any); }} />
            <QuickAction icon="calendar" label="Schedule" color={PURPLE} delay={60}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/schedule" as any); }} />
            <QuickAction icon="message-circle" label="AI Help" color="#06B6D4" delay={120}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/chat" as any); }} />
            <QuickAction icon="alert-triangle" label="Emergency" color="#F59E0B" delay={180}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); router.push("/emergency" as any); }} />
          </View>
        </View>

        {/* ── Follow-up Banner ── */}
        {upcomingFollowUp && (
          <AnimPressable
            onPress={() => router.push("/(tabs)/followups" as any)}
            style={styles.followupCard}
          >
            <LinearGradient colors={["#EDE9FE", "#F5F3FF"]} style={styles.followupGrad}>
              <View style={styles.followupLeft}>
                <View style={styles.followupIconWrap}>
                  <Feather name="calendar" size={18} color={PURPLE} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.followupTitle}>Upcoming Appointment</Text>
                  <Text style={styles.followupName} numberOfLines={1}>{upcomingFollowUp.title}</Text>
                  <Text style={styles.followupDate} numberOfLines={1}>
                    {new Date(upcomingFollowUp.dateTime).toLocaleDateString("en", {
                      weekday: "short", month: "short", day: "numeric",
                    })} · {upcomingFollowUp.doctorName}
                  </Text>
                </View>
              </View>
              <View style={styles.followupArrow}>
                <Feather name="chevron-right" size={16} color={PURPLE} />
              </View>
            </LinearGradient>
          </AnimPressable>
        )}

        {/* ── Recent Doses ── */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Doses</Text>
            <TouchableOpacity
              onPress={() => setShowAll(!showAll)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.seeAll}>{showAll ? "Show less" : "See all"}</Text>
            </TouchableOpacity>
          </View>

          {recentActivity.length === 0 ? (
            <View style={styles.emptyDoses}>
              <Text style={styles.emptyEmoji}>🌟</Text>
              <Text style={styles.emptyText}>All doses are clear today!</Text>
            </View>
          ) : (
            recentActivity.map(({ dose, med }, idx) => {
              if (!med) return null;
              const statusColor = dose.status === "taken" ? "#22C55E" : dose.status === "missed" ? "#EF4444" : PURPLE;
              const statusIcon = dose.status === "taken" ? "check-circle" : dose.status === "missed" ? "x-circle" : "clock";
              return (
                <DoseRow
                  key={dose.id}
                  dose={dose}
                  med={med}
                  statusColor={statusColor}
                  statusIcon={statusIcon}
                  delay={idx * 60}
                  onPress={() => {
                    if (dose.status === "pending") {
                      updateDoseStatus(dose.id, "taken");
                      setMascotTrigger(prev => prev + 1);
                    }
                  }}
                />
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Animated Dose Row ────────────────────────────────────────────────────────
function DoseRow({ dose, med, statusColor, statusIcon, delay, onPress }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 9, delay } as any),
    ]).start();
  }, []);

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, friction: 8 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }).start()}
      activeOpacity={1}
      disabled={dose.status !== "pending"}
    >
      <Animated.View
        style={[
          styles.doseRow,
          { opacity: fadeAnim, transform: [{ scale }, { translateY: slideAnim }] },
        ]}
      >
        <View style={[styles.doseIcon, { backgroundColor: `${med.color}15` }]}>
          <Feather name="package" size={18} color={med.color} />
        </View>
        <View style={styles.doseInfo}>
          <Text style={styles.doseName} numberOfLines={1}>{dose.medicineName}</Text>
          <Text style={styles.doseSub} numberOfLines={1}>{med.dosage} · {dose.scheduledTime}</Text>
        </View>
        <View style={[styles.doseStatus, { backgroundColor: `${statusColor}12` }]}>
          <Feather name={statusIcon as any} size={17} color={statusColor} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Caregiver Dashboard ──────────────────────────────────────────────────────
function CaregiverDashboard({ topInset }: { topInset: number }) {
  const { user, linkedPatients } = useApp();
  const { open: openSidebar } = useSidebar();
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const patient = linkedPatients[0];

  const heroFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(heroFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F4FB" }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 110 }}>
        <LinearGradient
          colors={["#4B26C8", PURPLE, "#8B5CF6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerBg, { paddingTop: topInset + 14 }]}
        >
          <View style={styles.decor1} />
          <View style={styles.decor2} />
          <Animated.View style={[styles.headerTop, { opacity: heroFade }]}>
            <AnimPressable onPress={openSidebar} style={styles.iconBtn}>
              <Feather name="menu" size={21} color="#fff" />
            </AnimPressable>
            <View style={styles.greetBlock}>
              <Text style={styles.greetText}>Caregiver Mode</Text>
              <Text style={styles.nameText} numberOfLines={1}>{(user?.name ?? "Caregiver").split(" ")[0]} 💜</Text>
            </View>
            <AnimPressable onPress={() => {}} style={styles.iconBtn}>
              <Feather name="settings" size={19} color="#fff" />
            </AnimPressable>
          </Animated.View>
          <MascotBuddy size={isSmall ? 76 : 84} message="Hi! Let's keep our patient safe today! 💜" />
          <View style={styles.careStats}>
            <View style={styles.careStat}>
              <Text style={styles.careStatVal}>98%</Text>
              <Text style={styles.careStatLbl}>Adherence</Text>
            </View>
            <View style={styles.careStatDivider} />
            <View style={styles.careStat}>
              <Text style={styles.careStatVal}>0</Text>
              <Text style={styles.careStatLbl}>Alerts</Text>
            </View>
            <View style={styles.careStatDivider} />
            <View style={styles.careStat}>
              <Text style={styles.careStatVal}>Stable</Text>
              <Text style={styles.careStatLbl}>Status</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.quickSection}>
          <Text style={styles.sectionTitle}>Caregiver Actions</Text>
          <View style={styles.quickRow}>
            <QuickAction icon="eye" label="Monitor" color={PURPLE} delay={0} onPress={() => {}} />
            <QuickAction icon="bell" label="Remind" color="#F59E0B" delay={60} onPress={() => {}} />
            <QuickAction icon="message-circle" label="Message" color="#06B6D4" delay={120} onPress={() => {}} />
            <QuickAction icon="alert-triangle" label="Alert" color="#EF4444" delay={180} onPress={() => {}} />
          </View>
        </View>

        {patient && (
          <View style={styles.patientCard}>
            <View style={styles.patientAvatar}>
              <Feather name="user" size={22} color={PURPLE} />
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName} numberOfLines={1}>{patient.name}</Text>
              <Text style={styles.patientStatus} numberOfLines={2}>Recovery in progress · Stable condition</Text>
            </View>
            <View style={[styles.patientBadge, { backgroundColor: "#DCFCE7" }]}>
              <Text style={[styles.patientBadgeText, { color: "#16A34A" }]}>Stable</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  headerBg: {
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
  headerTop: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: edgePad, marginBottom: 4,
  },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center", justifyContent: "center",
  },
  greetBlock: { alignItems: "center", flex: 1, paddingHorizontal: 8 },
  greetText: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontFamily: "Inter_400Regular" },
  nameText: { color: "#fff", fontSize: isSmall ? 17 : 19, fontFamily: "Inter_700Bold" },
  notifDot: {
    position: "absolute", top: 9, right: 9,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#FCD34D",
    borderWidth: 1.5, borderColor: PURPLE,
  },

  // Stats block — two-row responsive layout
  statsBlock: {
    marginHorizontal: edgePad,
    marginTop: 8,
    gap: 12,
  },
  statsRow1: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  ringWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  dosesBlock: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  riskBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 20,
  },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
  dosesMain: {
    color: "#fff", fontSize: isSmall ? 26 : 32,
    fontFamily: "Inter_700Bold", lineHeight: isSmall ? 32 : 38,
    includeFontPadding: false,
  },
  dosesLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" },

  statsRow2: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    padding: 12,
    justifyContent: "space-around",
  },
  statChip: {
    flex: 1, alignItems: "center", gap: 2,
  },
  statChipNum: { fontSize: isSmall ? 16 : 18, fontFamily: "Inter_700Bold" },
  statChipLbl: { fontSize: 10, fontFamily: "Inter_400Regular" },
  statsDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.2)" },

  // Weekly chart
  weeklyWrap: {
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: 22, padding: 14,
    marginHorizontal: edgePad, marginTop: 16,
  },
  weeklyHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  weeklyLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "Inter_500Medium" },

  // Quick actions
  quickSection: { paddingHorizontal: edgePad, paddingTop: 26, paddingBottom: 4 },
  quickRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  quickItem: { alignItems: "center", flex: 1, paddingHorizontal: 2 },
  quickCircle: {
    width: isSmall ? 52 : 58, height: isSmall ? 52 : 58, borderRadius: isSmall ? 26 : 29,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, marginBottom: 7,
    shadowColor: "#6C47FF", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  quickLabel: {
    fontSize: isSmall ? 10 : 11, fontFamily: "Inter_600SemiBold",
    color: "#4B5563", textAlign: "center",
  },

  // Follow-up
  followupCard: { marginHorizontal: edgePad, marginTop: 18, borderRadius: 22, overflow: "hidden" },
  followupGrad: { padding: 16, flexDirection: "row", alignItems: "center" },
  followupLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0 },
  followupIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 2,
    flexShrink: 0,
  },
  followupTitle: { fontSize: 10, fontFamily: "Inter_500Medium", color: PURPLE, marginBottom: 1 },
  followupName: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#1E1B4B" },
  followupDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#6B7280", marginTop: 1 },
  followupArrow: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },

  // Recent doses
  recentSection: { paddingHorizontal: edgePad, paddingTop: 22 },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 14,
  },
  sectionTitle: { fontSize: isSmall ? 16 : 17, fontFamily: "Inter_700Bold", color: "#1E1B4B" },
  seeAll: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: PURPLE },

  doseRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 18, padding: 13,
    marginBottom: 9,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  doseIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  doseInfo: { flex: 1, minWidth: 0 },
  doseName: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#1E1B4B" },
  doseSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#6B7280", marginTop: 1 },
  doseStatus: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", flexShrink: 0 },

  emptyDoses: { alignItems: "center", paddingVertical: 28, gap: 8 },
  emptyEmoji: { fontSize: 34 },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#6B7280" },

  // Caregiver
  careStats: {
    flexDirection: "row", marginHorizontal: edgePad, marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 20, padding: 16,
    alignItems: "center", justifyContent: "space-between",
  },
  careStat: { flex: 1, alignItems: "center" },
  careStatVal: { color: "#fff", fontSize: isSmall ? 18 : 20, fontFamily: "Inter_700Bold" },
  careStatLbl: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  careStatDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.2)" },

  patientCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: edgePad, marginTop: 14,
    backgroundColor: "#fff", borderRadius: 20, padding: 14,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  patientAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: PURPLE_LIGHT, alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  patientInfo: { flex: 1, minWidth: 0 },
  patientName: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#1E1B4B" },
  patientStatus: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#6B7280", marginTop: 2 },
  patientBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, flexShrink: 0 },
  patientBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  scrollContent: { paddingHorizontal: 0 },
});
