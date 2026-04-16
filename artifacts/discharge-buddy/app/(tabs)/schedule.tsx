import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useSidebar } from "@/context/SidebarContext";

const { width } = Dimensions.get("window");
const TEAL = "#0891b2";
const TEAL_DARK = "#0c4a6e";
const WHITE = "#ffffff";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { open: openSidebar } = useSidebar();

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const { todayDoses, medicines, followUps } = useApp();

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const isToday = (d: number) =>
    d === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectedDate = new Date(viewYear, viewMonth, selectedDay);

  const timeline = useMemo(() => {
    const items: Array<{
      time: string;
      title: string;
      subtitle: string;
      color: string;
      type: "dose" | "followup";
      status?: string;
    }> = [];

    const isSelected = (d: Date) =>
      d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getFullYear() === selectedDate.getFullYear();

    const isSameDay = (d1: Date, d2: Date) =>
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();

    if (isSameDay(selectedDate, today)) {
      todayDoses?.forEach(dose => {
        const med = medicines?.find(m => m.id === dose.medicineId);
        items.push({
          time: dose.scheduledTime,
          title: dose.medicineName,
          subtitle: `${med?.dosage ?? ""} · ${med?.instructions ?? "Take as prescribed"}`,
          color: med?.color ?? TEAL,
          type: "dose",
          status: dose.status,
        });
      });
    } else {
      medicines?.forEach(med => {
        med.times?.forEach(s => {
          items.push({
            time: s,
            title: med.name,
            subtitle: `${med.dosage} · ${med.instructions}`,
            color: med.color,
            type: "dose",
            status: "scheduled",
          });
        });
      });
    }

    followUps.filter(f => !f.completed).forEach(f => {
      const d = new Date(f.dateTime);
      if (isSameDay(d, selectedDate)) {
        items.push({
          time: d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }),
          title: f.title,
          subtitle: f.doctorName + (f.location ? ` · ${f.location}` : ""),
          color: "#8b5cf6",
          type: "followup",
          status: "upcoming",
        });
      }
    });

    items.sort((a, b) => a.time.localeCompare(b.time));
    return items;
  }, [selectedDay, viewMonth, viewYear, todayDoses, medicines, followUps]);

  const STATUS_COLOR: Record<string, string> = {
    taken: "#10b981",
    missed: "#ef4444",
    snoozed: "#f59e0b",
    pending: TEAL,
    upcoming: "#8b5cf6",
    scheduled: "#64748b",
  };

  return (
    <View style={{ flex: 1, backgroundColor: WHITE }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 90 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topInset + 12 }]}>
          <TouchableOpacity onPress={openSidebar} style={styles.menuBtn}>
            <Feather name="menu" size={22} color={WHITE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Schedule</Text>
          <TouchableOpacity style={styles.menuBtn}>
            <Feather name="search" size={20} color={WHITE} />
          </TouchableOpacity>
        </View>

        {/* Calendar */}
        <View style={[styles.calCard, { marginTop: -2 }]}>
          {/* Month nav */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Feather name="chevron-left" size={20} color={TEAL_DARK} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.monthPill}>
              <Text style={styles.monthText}>{MONTHS[viewMonth]} {viewYear}</Text>
              <Feather name="chevron-down" size={14} color={TEAL_DARK} />
            </TouchableOpacity>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Feather name="chevron-right" size={20} color={TEAL_DARK} />
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={styles.dayHeaders}>
            {DAYS.map(d => (
              <Text key={d} style={styles.dayHeader}>{d}</Text>
            ))}
          </View>

          {/* Date grid */}
          <View style={styles.dateGrid}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dateCell} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const sel = day === selectedDay;
              const tod = isToday(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dateCell,
                    sel && styles.dateCellSelected,
                    !sel && tod && styles.dateCellToday,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedDay(day);
                  }}
                >
                  <Text
                    style={[
                      styles.dateText,
                      sel && styles.dateTextSelected,
                      !sel && tod && styles.dateTextToday,
                    ]}
                  >
                    {day}
                  </Text>
                  {tod && !sel && <View style={styles.todayDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timelineSection}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>
              {selectedDate.toLocaleDateString("en", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/scan")}
              style={styles.addBtn}
            >
              <Feather name="plus" size={16} color={WHITE} />
            </TouchableOpacity>
          </View>

          {timeline.length === 0 && (
            <View style={styles.emptyState}>
              <Feather name="calendar" size={40} color="#cbd5e1" />
              <Text style={styles.emptyText}>Nothing scheduled</Text>
              <Text style={styles.emptySub}>Tap + to add a dose or appointment</Text>
            </View>
          )}

          {timeline.map((item, i) => {
            const statusColor = STATUS_COLOR[item.status ?? "scheduled"] ?? TEAL;
            const isHighlighted = item.status === "pending" || item.status === "upcoming";
            return (
              <View key={i} style={styles.timelineRow}>
                {/* Time column */}
                <View style={styles.timeCol}>
                  <Text style={styles.timeText}>{item.time}</Text>
                </View>

                {/* Line + dot */}
                <View style={styles.lineCol}>
                  <View style={[styles.dot, { backgroundColor: statusColor }]} />
                  {i < timeline.length - 1 && <View style={styles.lineSegment} />}
                </View>

                {/* Card */}
                <View
                  style={[
                    styles.timelineCard,
                    isHighlighted && {
                      backgroundColor: `${statusColor}12`,
                      borderColor: `${statusColor}40`,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <View style={styles.timelineCardLeft}>
                    <View style={[styles.typeIcon, { backgroundColor: `${item.color}20` }]}>
                      <Feather
                        name={item.type === "followup" ? "calendar" : "package"}
                        size={14}
                        color={item.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timelineTitle}>{item.title}</Text>
                      <Text style={styles.timelineSub}>{item.subtitle}</Text>
                      {item.status && (
                        <View style={[styles.statusChip, { backgroundColor: `${statusColor}20` }]}>
                          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                          <Text style={[styles.statusText, { color: statusColor }]}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: TEAL_DARK,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: WHITE,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },

  calCard: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: 0,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
  },
  monthPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f0f9ff",
    borderRadius: 20,
  },
  monthText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: TEAL_DARK,
  },

  dayHeaders: {
    flexDirection: "row",
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#94a3b8",
    textTransform: "uppercase",
  },

  dateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dateCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 50,
  },
  dateCellSelected: {
    backgroundColor: TEAL,
  },
  dateCellToday: {
    backgroundColor: "#e0f2fe",
  },
  dateText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#334155",
  },
  dateTextSelected: {
    color: WHITE,
    fontFamily: "Inter_700Bold",
  },
  dateTextToday: {
    color: TEAL,
    fontFamily: "Inter_700Bold",
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: TEAL,
    marginTop: 2,
  },

  timelineSection: {
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#0f172a",
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#94a3b8",
  },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#cbd5e1",
  },

  timelineRow: {
    flexDirection: "row",
    marginBottom: 8,
    minHeight: 68,
  },
  timeCol: {
    width: 60,
    paddingTop: 12,
  },
  timeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#64748b",
    textAlign: "right",
    paddingRight: 8,
  },
  lineCol: {
    width: 24,
    alignItems: "center",
    paddingTop: 14,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
  },
  lineSegment: {
    flex: 1,
    width: 2,
    backgroundColor: "#e2e8f0",
    marginTop: 4,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 12,
    marginLeft: 8,
    marginBottom: 4,
  },
  timelineCardLeft: {
    flexDirection: "row",
    gap: 10,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#0f172a",
    marginBottom: 2,
  },
  timelineSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
    marginBottom: 6,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
