import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";

const TEAL = "#0891b2";
const TEAL_DARK = "#0c4a6e";
const WHITE = "#ffffff";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { user, role } = useApp();

  const STATS = [
    { label: "Days Active", value: "14" },
    { label: "Doses Taken", value: "87" },
    { label: "Adherence", value: "93%" },
  ];

  const FIELDS = [
    { label: "USERNAME", value: `@${(user?.name ?? "user").toLowerCase().replace(" ", "")}` },
    { label: "FULL NAME", value: user?.name ?? "—" },
    { label: "EMAIL ADDRESS", value: user?.email ?? "—" },
    { label: "ROLE", value: role === "caregiver" ? "Caregiver" : "Patient" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: WHITE }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 32 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topInset + 12 }]}>
          <TouchableOpacity 
            onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")} 
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={20} color={WHITE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{user?.name ?? "Profile"}</Text>
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={styles.backBtn}
          >
            <Feather name="settings" size={20} color={WHITE} />
          </TouchableOpacity>
        </View>

        {/* Avatar section */}
        <View style={styles.avatarSection}>
          {/* Decorative circles */}
          <View style={styles.decCircle1} />
          <View style={styles.decCircle2} />
          <View style={styles.decCircle3} />

          <View style={styles.avatarRing}>
            <View style={styles.avatarInner}>
              <Feather name={role === "caregiver" ? "users" : "user"} size={44} color={TEAL} />
            </View>
            <TouchableOpacity style={styles.editBadge}>
              <Feather name="edit-2" size={12} color={WHITE} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.waveBottom} />

        {/* Stats bar */}
        <View style={styles.statsBar}>
          {STATS.map((s, i) => (
            <View key={i} style={[styles.statItem, i < STATS.length - 1 && styles.statBorder]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Info fields */}
        <View style={styles.infoCard}>
          {FIELDS.map((f, i) => (
            <View key={i} style={[styles.fieldRow, i < FIELDS.length - 1 && styles.fieldBorder]}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <Text style={styles.fieldValue}>{f.value}</Text>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {[
            { icon: "edit" as const, label: "Edit Profile", color: TEAL },
            { icon: "lock" as const, label: "Change Password", color: "#8b5cf6" },
            { icon: "share-2" as const, label: "Share Recovery Report", color: "#10b981" },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={styles.actionRow}>
              <View style={[styles.actionIcon, { backgroundColor: `${item.color}15` }]}>
                <Feather name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={styles.actionLabel}>{item.label}</Text>
              <Feather name="chevron-right" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ))}
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
    paddingBottom: 60,
  },
  backBtn: {
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

  avatarSection: {
    backgroundColor: TEAL_DARK,
    alignItems: "center",
    paddingBottom: 40,
    marginTop: -60,
    paddingTop: 0,
    position: "relative",
  },
  decCircle1: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    left: 30,
    top: 10,
  },
  decCircle2: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
    left: 60,
    top: 40,
  },
  decCircle3: {
    position: "absolute",
    width: 55,
    height: 55,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    right: 40,
    top: 20,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.4)",
    position: "relative",
  },
  avatarInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: WHITE,
  },

  waveBottom: {
    backgroundColor: TEAL_DARK,
    height: 32,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    marginTop: -1,
  },

  statsBar: {
    flexDirection: "row",
    marginHorizontal: 18,
    marginTop: 20,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
  },
  statBorder: {
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: TEAL_DARK,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
  },

  infoCard: {
    marginHorizontal: 18,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  fieldRow: {
    paddingVertical: 14,
    gap: 4,
  },
  fieldBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#94a3b8",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  fieldValue: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#1e293b",
  },

  actions: {
    marginHorizontal: 18,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#1e293b",
  },
});
