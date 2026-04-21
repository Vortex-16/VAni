import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FollowUp, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function FollowupsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { followUps: rawFollowUps, addFollowUp, completeFollowUp } = useApp();
  const followUps = rawFollowUps || [];
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [doctor, setDoctor] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

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

  const daysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Follow-ups</Text>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {upcoming.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Upcoming</Text>
            {upcoming.map((f) => {
              const days = daysUntil(f.dateTime);
              const isUrgent = days <= 2;
              return (
                <View
                  key={f.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: isUrgent ? colors.warning : colors.border,
                      borderLeftColor: isUrgent ? colors.warning : colors.primary,
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardLeft}>
                      <Feather
                        name="calendar"
                        size={18}
                        color={isUrgent ? colors.warning : colors.primary}
                      />
                      <View>
                        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{f.title}</Text>
                        <Text style={[styles.cardDoctor, { color: colors.mutedForeground }]}>
                          {f.doctorName}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.daysBadge,
                        { backgroundColor: isUrgent ? `${colors.warning}20` : `${colors.primary}15` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.daysText,
                          { color: isUrgent ? colors.warning : colors.primary },
                        ]}
                      >
                        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                      </Text>
                    </View>
                  </View>

                  {f.location ? (
                    <View style={styles.detail}>
                      <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.detailText, { color: colors.mutedForeground }]}>{f.location}</Text>
                    </View>
                  ) : null}

                  <View style={styles.detail}>
                    <Feather name="clock" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                      {new Date(f.dateTime).toLocaleDateString("en", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>

                  {f.notes ? (
                    <Text style={[styles.cardNotes, { color: colors.mutedForeground }]}>{f.notes}</Text>
                  ) : null}

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      completeFollowUp(f.id);
                    }}
                    style={[styles.completeBtn, { borderColor: colors.success }]}
                  >
                    <Feather name="check" size={14} color={colors.success} />
                    <Text style={[styles.completeBtnText, { color: colors.success }]}>Mark Complete</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        {completed.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 20 }]}>Completed</Text>
            {completed.map((f) => (
              <View
                key={f.id}
                style={[styles.card, { backgroundColor: `${colors.muted}80`, borderColor: colors.border, opacity: 0.7 }]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardLeft}>
                    <Feather name="check-circle" size={18} color={colors.success} />
                    <View>
                      <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>{f.title}</Text>
                      <Text style={[styles.cardDoctor, { color: colors.mutedForeground }]}>{f.doctorName}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {followUps.length === 0 && (
          <View style={styles.empty}>
            <Feather name="calendar" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>No Follow-ups</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Add your doctor appointments and tests
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Follow-up</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
            <ModalInput label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Cardiology Follow-up" colors={colors} />
            <ModalInput label="Doctor / Location" value={doctor} onChangeText={setDoctor} placeholder="Dr. Name or Hospital" colors={colors} />
            <ModalInput label="Address / Room" value={location} onChangeText={setLocation} placeholder="Location (optional)" colors={colors} />
            <ModalInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Preparation notes..." colors={colors} multiline />
            <TouchableOpacity onPress={handleAdd} style={[styles.submitBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.submitBtnText]}>Add Appointment</Text>
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
  colors,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  colors: ReturnType<typeof useColors>;
  multiline?: boolean;
}) {
  return (
    <View>
      <Text style={[styles.inputLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.foreground,
            minHeight: multiline ? 80 : 48,
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 12,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardLeft: { flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardDoctor: { fontSize: 13, fontFamily: "Inter_400Regular" },
  daysBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  daysText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  detail: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardNotes: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  completeBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
  },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  inputLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, fontFamily: "Inter_400Regular" },
  submitBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 8 },
  submitBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
