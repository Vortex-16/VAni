import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Animated, { 
  FadeInDown, 
  FadeInRight, 
  Layout, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { useApp } from "@/context/AppContext";

const { width } = Dimensions.get("window");
const PURPLE = "#6C47FF";
const WHITE = "#ffffff";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 20 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [isMonthView, setIsMonthView] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const { 
    todayDoses: rawDoses, 
    medicines: rawMeds, 
    followUps: rawFUs, 
    updateDoseStatus, 
    drugInteractions,
  } = useApp();
  const todayDoses = rawDoses || [];
  const medicines = rawMeds || [];
  const followUps = rawFUs || [];

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  // Generate 30 days around today
  const dateStrip = useMemo(() => {
    const dates = [];
    for (let i = -15; i <= 15; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [today]);

  const scrollViewRef = useRef<ScrollView>(null);
  
  // Center the scrollview on mount
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: 15 * 60 - width / 2 + 30, animated: false });
    }, 100);
  }, []);

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1.2, { duration: 600 }), withTiming(1, { duration: 600 })), -1);
  }, []);
  const animatedWarning = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: withTiming(pulse.value === 1.2 ? 0.8 : 1)
  }));

  const timeline = useMemo(() => {
    let items: Array<{
      time: string;
      title: string;
      subtitle: string;
      color: string;
      type: "dose" | "followup";
      status?: string;
      rawId?: string;
    }> = [];

    if (isSameDay(selectedDate, today)) {
      todayDoses?.forEach(dose => {
        const med = medicines?.find(m => m.id === dose.medicineId);
        items.push({
          time: dose.scheduledTime,
          title: dose.medicineName,
          subtitle: `${med?.dosage ?? ""} · ${med?.instructions ?? "Take as prescribed"}`,
          color: med?.color ?? PURPLE,
          type: "dose",
          status: dose.status,
          rawId: dose.id
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
          time: d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false }),
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
  }, [selectedDate, todayDoses, medicines, followUps]);

  const STATUS_COLOR: Record<string, string> = {
    taken: "#10b981",
    missed: "#ef4444",
    snoozed: "#f59e0b",
    pending: PURPLE,
    upcoming: "#8b5cf6",
    scheduled: "#64748b",
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="chevron-left" size={24} color="#1E1B4B" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Feather name="search" size={20} color="#1E1B4B" style={{ marginRight: 16 }} />
          <Feather name="sliders" size={20} color="#1E1B4B" />
        </View>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.pageTitle} numberOfLines={1}>Schedule</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity 
            style={styles.iconBtnSmall}
            onPress={() => setIsMonthView(!isMonthView)}
          >
            <Feather name={isMonthView ? "list" : "grid"} size={20} color={PURPLE} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.monthPill}
            activeOpacity={0.7}
            onPress={() => setShowPicker(true)}
          >
            <Text style={styles.monthText}>{MONTHS[selectedDate.getMonth()]}</Text>
            <Feather name="chevron-down" size={16} color="#64748B" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </View>

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowPicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      {/* Full Month Grid View */}
      {isMonthView ? (
        <Animated.View entering={FadeInDown} style={styles.monthGridContainer}>
          <View style={styles.weekLabels}>
            {DAYS.map(d => <Text key={d} style={styles.weekText}>{d[0]}</Text>)}
          </View>
          <View style={styles.daysGrid}>
            {(() => {
              const year = selectedDate.getFullYear();
              const month = selectedDate.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const cells = [];
              
              // Padding for first week
              for (let i = 0; i < firstDay; i++) {
                cells.push(<View key={`pad-${i}`} style={styles.dayCell} />);
              }
              
              for (let d = 1; d <= daysInMonth; d++) {
                const dateObj = new Date(year, month, d);
                const isSelected = isSameDay(dateObj, selectedDate);
                const isToday = isSameDay(dateObj, today);
                
                cells.push(
                  <TouchableOpacity 
                    key={d} 
                    style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                    onPress={() => {
                      setSelectedDate(dateObj);
                      setIsMonthView(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={[
                      styles.dayCellText, 
                      isSelected && { color: WHITE },
                      isToday && !isSelected && { color: PURPLE, fontWeight: '700' }
                    ]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                );
              }
              return cells;
            })()}
          </View>
        </Animated.View>
      ) : (
        /* Horizontal Calendar Strip */
        <View style={styles.calendarStripWrapper}>
          <ScrollView 
            ref={scrollViewRef}
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.calendarStrip}
          >
            {dateStrip.map((d, i) => {
              const sel = isSameDay(d, selectedDate);
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.dateCol, sel && styles.dateColSelected]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedDate(d);
                  }}
                >
                  <Text style={[styles.dayName, sel && styles.textSelected]}>{DAYS[d.getDay()]}</Text>
                  <Text style={[styles.dayNumber, sel && styles.textSelected]}>{d.getDate()}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 120, paddingTop: 0 }}
      >
        {timeline.length === 0 ? (
          <Animated.View entering={FadeInDown} style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Feather name="calendar" size={32} color={PURPLE} />
            </View>
            <Text style={styles.emptyText}>Nothing scheduled</Text>
            <Text style={styles.emptySub}>Tap the + button to add an appointment or dose</Text>
          </Animated.View>
        ) : (
          <View style={styles.timelineSection}>
            {timeline.map((item, i) => {
              const statusColor = STATUS_COLOR[item.status ?? "scheduled"] ?? PURPLE;
              const isHighlighted = item.status === "pending" || item.status === "upcoming";
              
              return (
                <Animated.View 
                  key={i} 
                  entering={FadeInRight.delay(i * 100)}
                  layout={Layout}
                  style={styles.timelineRow}
                >
                  <View style={styles.timeCol}>
                    <Text style={[styles.timeText, isHighlighted && { color: '#0f172a', fontFamily: 'Inter_700Bold' }]}>
                      {item.time}
                    </Text>
                  </View>

                  <View style={styles.lineCol}>
                    {item.status === 'taken' ? (
                      <View style={styles.checkRing}>
                        <Feather name="check" size={10} color="#cbd5e1" />
                      </View>
                    ) : (
                      <View style={[styles.dot, { backgroundColor: isHighlighted ? statusColor : '#e2e8f0' }]} />
                    )}
                    {i < timeline.length - 1 && <View style={styles.verticalLine} />}
                  </View>

                  <View style={styles.cardCol}>
                    <View style={styles.cardContainer}>
                      {isHighlighted && (
                        <LinearGradient
                          colors={[`${statusColor}15`, `${statusColor}00`]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                        />
                      )}
                      
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Text style={[styles.cardTitle, isHighlighted && { fontFamily: 'Inter_700Bold' }]}>{item.title}</Text>
                        
                        {item.type === "dose" && drugInteractions?.some(di => di.medIds.includes(item.rawId || "")) && (
                          <TouchableOpacity onPress={() => Alert.alert("⚠️ Interaction Warning", drugInteractions.find(di => di.medIds.includes(item.rawId || ""))?.description)}>
                            <Animated.View style={[styles.warningIcon, animatedWarning]}>
                              <Feather name="alert-triangle" size={14} color="#ef4444" />
                            </Animated.View>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.cardMeta}>
                        <Feather name={item.type === "followup" ? "map-pin" : "package"} size={12} color="#94a3b8" />
                        <Text style={styles.cardSub}>{item.subtitle}</Text>
                      </View>
                      
                      <View style={styles.cardMeta}>
                        <Feather name="clock" size={12} color="#94a3b8" />
                        <Text style={styles.cardSub}>{item.time}</Text>
                      </View>
                      
                      {item.type === "dose" && (item.status === "pending" || item.status === "snoozed") && item.rawId && (
                        <View style={styles.actionRow}>
                          <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: PURPLE }]}
                            onPress={() => {
                              updateDoseStatus(item.rawId!, "taken");
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }}
                          >
                            <Feather name="check" size={12} color={WHITE} />
                            <Text style={styles.actionBtnText}>Take</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* No FAB here - using global TabBar FAB */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  iconBtn: {
    width: 40, height: 40,
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#0f172a',
    flex: 1,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  monthText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#334155',
  },
  calendarStripWrapper: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    paddingBottom: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 10,
  },
  calendarStrip: {
    paddingHorizontal: 20,
    gap: 20, // Increased gap to prevent overlap
  },
  dateCol: {
    width: 54, // Increased width for better touch target and spacing
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  dateColSelected: {
    backgroundColor: PURPLE,
  },
  dayName: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#94a3b8',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#334155',
  },
  textSelected: { color: WHITE },
  
  timelineSection: {
    paddingHorizontal: 20,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 0,
    minHeight: 80,
  },
  timeCol: {
    width: 65,
    paddingTop: 14,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#94a3b8',
  },
  lineCol: {
    width: 30,
    alignItems: 'center',
    paddingTop: 18,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e2e8f0',
    zIndex: 2,
  },
  checkRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    zIndex: 2,
  },
  verticalLine: {
    position: 'absolute',
    top: 28,
    bottom: -18,
    width: 2,
    backgroundColor: '#e2e8f0',
    zIndex: 1,
  },
  cardCol: {
    flex: 1,
    paddingBottom: 24,
  },
  cardContainer: {
    padding: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#0f172a',
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#64748b',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: WHITE,
  },
  warningIcon: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#fee2e2',
    alignItems: 'center', justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f3f0ff', alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#1e1b4b' },
  emptySub: { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#94a3b8', textAlign: 'center', paddingHorizontal: 40 },
  iconBtnSmall: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthGridContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: WHITE,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  weekLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#94a3b8',
    width: 40,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  dayCellSelected: {
    backgroundColor: PURPLE,
  },
  dayCellText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#334155',
  },
});
