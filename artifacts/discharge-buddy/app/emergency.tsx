import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmergencyButton } from "@/components/EmergencyButton";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function EmergencyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { patient } = useApp();

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const DANGER_SIGNS = [
    { sign: "Chest pain or pressure", urgent: true },
    { sign: "Difficulty breathing", urgent: true },
    { sign: "Sudden confusion or disorientation", urgent: true },
    { sign: "Slurred speech or facial drooping", urgent: true },
    { sign: "Severe dizziness or loss of balance", urgent: true },
    { sign: "Rapid or irregular heartbeat", urgent: false },
    { sign: "Severe vomiting or inability to keep medicines down", urgent: false },
    { sign: "Sudden severe swelling", urgent: false },
    { sign: "High fever (above 38.5°C / 101.3°F)", urgent: false },
    { sign: "Unusual bleeding", urgent: false },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 12, paddingBottom: 80, paddingHorizontal: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Emergency</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={[styles.emergencyCard, { backgroundColor: `${colors.emergency}10`, borderColor: `${colors.emergency}40` }]}>
        <Text style={[styles.cardTitle, { color: colors.emergency }]}>Emergency Alert</Text>
        <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
          Press and hold to notify your caregiver and share your location
        </Text>
        <View style={styles.btnWrapper}>
          <EmergencyButton />
        </View>
      </View>

      <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.contactTitle, { color: colors.foreground }]}>Emergency Contacts</Text>
        {[
          { label: "Emergency Contact", number: patient?.emergencyContact ?? "Not set", icon: "user" as const },
          { label: "Emergency Services", number: "112 / 911", icon: "phone-call" as const },
          { label: "Hospital Helpline", number: "1800-XXX-XXXX", icon: "home" as const },
        ].map((c, i) => (
          <View key={i} style={[styles.contactRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.contactIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Feather name={c.icon} size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactLabel, { color: colors.mutedForeground }]}>{c.label}</Text>
              <Text style={[styles.contactNumber, { color: colors.foreground }]}>{c.number}</Text>
            </View>
            <TouchableOpacity style={[styles.callBtn, { backgroundColor: `${colors.success}15` }]}>
              <Feather name="phone" size={16} color={colors.success} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Danger Signs — Seek Help Immediately</Text>

      {DANGER_SIGNS.map((item, i) => (
        <View
          key={i}
          style={[
            styles.dangerRow,
            {
              backgroundColor: item.urgent ? `${colors.destructive}08` : colors.card,
              borderColor: item.urgent ? `${colors.destructive}30` : colors.border,
            },
          ]}
        >
          <Feather
            name={item.urgent ? "alert-triangle" : "alert-circle"}
            size={16}
            color={item.urgent ? colors.destructive : colors.warning}
          />
          <Text
            style={[
              styles.dangerText,
              { color: item.urgent ? colors.destructive : colors.foreground },
            ]}
          >
            {item.sign}
          </Text>
          {item.urgent && (
            <View style={[styles.urgentBadge, { backgroundColor: `${colors.destructive}20` }]}>
              <Text style={[{ color: colors.destructive, fontSize: 10, fontFamily: "Inter_700Bold" }]}>URGENT</Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emergencyCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  cardSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  btnWrapper: { marginTop: 10 },
  contactCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    gap: 4,
  },
  contactTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  contactIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  contactLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  contactNumber: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  callBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  dangerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  dangerText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  urgentBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
});
