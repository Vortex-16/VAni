import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, ActivityIndicator,  } from 'react-native';
import { TranslateText as Text } from '@/components/TranslateText';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";

import { FollowUp, useApp } from "@/context/AppContext";

const BACKGROUND = "#F5F4FB";
const WHITE = "#FFFFFF";
const TEXT_MAIN = "#1E1B4B";
const TEXT_MUTED = "#6B7280";
const PRIMARY = "#6C47FF";
const PRIMARY_LIGHT = "#EDE9FE";
const BORDER = "#E2E8F0";
const WARNING = "#F59E0B";
const SUCCESS = "#10B981";

export default function FollowupsScreen() {
  const insets = useSafeAreaInsets();
  const { followUps: rawFollowUps, addFollowUp, completeFollowUp } = useApp();
  const followUps = rawFollowUps || [];
  
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [doctor, setDoctor] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const upcoming = followUps.filter((f) => !f.completed);
  const completed = followUps.filter((f) => f.completed);

  const handleAdd = () => {
    if (!title || !doctor) {
      Alert.alert("Missing Info", "Please fill in the title and doctor name.");
      return;
    }
    const fu: FollowUp = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title,
      doctorName: doctor,
      dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      location,
      notes,
      completed: false,
    };
    addFollowUp(fu);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTitle("");
    setDoctor("");
    setLocation("");
    setNotes("");
    setShowModal(false);
  };

  const handleGetCurrentLocation = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGettingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission denied", "Allow location access to use this feature.");
        setIsGettingLocation(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      // Optionally reverse geocode to get an address string
      let reverseLoc = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (reverseLoc && reverseLoc.length > 0) {
        const address = `${reverseLoc[0].name || reverseLoc[0].street}, ${reverseLoc[0].city}`;
        setLocation(address);
      } else {
        setLocation(`${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not get current location.");
    } finally {
      setIsGettingLocation(false);
    }
  };

  const daysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#4B26C8", PRIMARY, "#8B5CF6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerBg, { paddingTop: topInset + 12 }]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Follow-ups</Text>
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            style={styles.addBtn}
          >
            <Feather name="plus" size={20} color={PRIMARY} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {upcoming.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Upcoming</Text>
            {upcoming.map((f) => {
              const days = daysUntil(f.dateTime);
              const isUrgent = days <= 2;
              return (
                <View
                  key={f.id}
                  style={[
                    styles.card,
                    { borderLeftColor: isUrgent ? WARNING : PRIMARY }
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardLeft}>
                      <View style={[styles.iconWrap, { backgroundColor: isUrgent ? "#FEF3C7" : PRIMARY_LIGHT }]}>
                        <Feather
                          name="calendar"
                          size={18}
                          color={isUrgent ? WARNING : PRIMARY}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{f.title}</Text>
                        <Text style={styles.cardDoctor}>{f.doctorName}</Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.daysBadge,
                        { backgroundColor: isUrgent ? "#FEF3C7" : PRIMARY_LIGHT },
                      ]}
                    >
                      <Text
                        style={[
                          styles.daysText,
                          { color: isUrgent ? "#B45309" : PRIMARY },
                        ]}
                      >
                        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailsContainer}>
                    {f.location ? (
                      <View style={styles.detail}>
                        <Feather name="map-pin" size={14} color={TEXT_MUTED} />
                        <Text style={styles.detailText}>{f.location}</Text>
                      </View>
                    ) : null}

                    <View style={styles.detail}>
                      <Feather name="clock" size={14} color={TEXT_MUTED} />
                      <Text style={styles.detailText}>
                        {new Date(f.dateTime).toLocaleDateString("en", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>

                  {f.notes ? (
                    <View style={styles.notesContainer}>
                      <Text style={styles.cardNotes}>{f.notes}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      completeFollowUp(f.id);
                    }}
                    style={styles.completeBtn}
                  >
                    <Feather name="check-circle" size={16} color={SUCCESS} />
                    <Text style={styles.completeBtnText}>Mark Complete</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        {completed.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Completed</Text>
            {completed.map((f) => (
              <View
                key={f.id}
                style={[styles.card, styles.completedCard]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardLeft}>
                    <View style={[styles.iconWrap, { backgroundColor: "#D1FAE5" }]}>
                      <Feather name="check" size={18} color={SUCCESS} />
                    </View>
                    <View>
                      <Text style={[styles.cardTitle, { color: TEXT_MUTED, textDecorationLine: "line-through" }]}>{f.title}</Text>
                      <Text style={styles.cardDoctor}>{f.doctorName}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {followUps.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Feather name="calendar" size={32} color={PRIMARY} />
            </View>
            <Text style={styles.emptyTitle}>No Follow-ups</Text>
            <Text style={styles.emptySubtitle}>
              Add your doctor appointments and tests to keep track of your recovery journey.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Follow-up</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
              <Feather name="x" size={20} color={TEXT_MAIN} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <ModalInput label="Appointment Title" value={title} onChangeText={setTitle} placeholder="e.g. Cardiology Checkup" />
            <ModalInput label="Doctor Name" value={doctor} onChangeText={setDoctor} placeholder="Dr. Sarah Mitchell" />
            
            <View>
              <View style={styles.locationHeader}>
                <Text style={styles.inputLabel}>Location / Room</Text>
                <TouchableOpacity onPress={handleGetCurrentLocation} style={styles.currentLocBtn}>
                  {isGettingLocation ? (
                    <ActivityIndicator size="small" color={PRIMARY} />
                  ) : (
                    <>
                      <Feather name="navigation" size={12} color={PRIMARY} />
                      <Text style={styles.currentLocText}>Use Current Location</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Hospital Name or Address"
                placeholderTextColor={TEXT_MUTED}
                style={[styles.input, { minHeight: 48 }]}
              />
            </View>

            <ModalInput label="Notes / Preparation" value={notes} onChangeText={setNotes} placeholder="Bring latest reports..." multiline />
            
            <TouchableOpacity onPress={handleAdd} style={styles.submitBtn}>
              <Text style={styles.submitBtnText}>Save Appointment</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function ModalInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={TEXT_MUTED}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        style={[
          styles.input,
          {
            minHeight: multiline ? 100 : 50,
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },
  headerBg: {
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: { fontSize: 26, fontFamily: "Inter_800ExtraBold", color: WHITE, letterSpacing: -0.5 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionLabel: { fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT_MAIN, marginBottom: 12, marginLeft: 4 },
  card: {
    backgroundColor: WHITE,
    padding: 16,
    borderRadius: 20,
    borderLeftWidth: 5,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  completedCard: {
    borderLeftWidth: 0,
    backgroundColor: "#F9FAFB",
    opacity: 0.8,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT_MAIN, marginBottom: 2 },
  cardDoctor: { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT_MUTED },
  daysBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  daysText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  detailsContainer: { gap: 8, marginTop: 4, paddingLeft: 52 },
  detail: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailText: { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT_MUTED },
  notesContainer: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
    marginTop: 4,
    marginLeft: 52,
  },
  cardNotes: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#475569", fontStyle: "italic" },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignSelf: "flex-start",
    marginLeft: 52,
    marginTop: 4,
  },
  completeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: SUCCESS },
  empty: { alignItems: "center", paddingTop: 80, gap: 16, paddingHorizontal: 30 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT_MAIN },
  emptySubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", color: TEXT_MUTED, textAlign: "center", lineHeight: 22 },
  modal: { flex: 1, backgroundColor: BACKGROUND },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT_MAIN },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  currentLocBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentLocText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: PRIMARY,
  },
  inputLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT_MAIN, marginBottom: 8 },
  input: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: TEXT_MAIN,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  submitBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: WHITE },
});
