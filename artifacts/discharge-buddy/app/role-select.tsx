import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function RoleSelectScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setRole, setUser, isOnboarded } = useApp();

  useEffect(() => {
    if (isOnboarded === false) {
      router.replace('/onboarding');
    }
  }, [isOnboarded]);

  if (isOnboarded === false) return null;

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSelect = (role: "patient" | "caregiver") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRole(role);
    setUser({
      id: Date.now().toString(),
      name: role === "patient" ? "John Doe" : "Mary Doe",
      email: `${role}@example.com`,
      role,
      linkedPatientId: role === "caregiver" ? "p1" : undefined,
    });
    if (role === "caregiver") {
      router.replace("/caregiver/dashboard");
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: topInset + 20, paddingBottom: bottomInset + 20 },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.logoCircle, { backgroundColor: `${colors.primary}20` }]}>
          <Feather name="heart" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Welcome to{"\n"}DischargeBuddy</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Who are you? We'll personalize your experience.
        </Text>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity
          onPress={() => handleSelect("patient")}
          style={[styles.roleCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={[styles.iconBox, { backgroundColor: `${colors.primary}15` }]}>
            <Feather name="user" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.roleTitle, { color: colors.foreground }]}>I'm a Patient</Text>
          <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>
            Track my medicines, symptoms, and follow-up appointments after discharge
          </Text>
          <View style={[styles.selectBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.selectText, { color: colors.primaryForeground }]}>Continue as Patient</Text>
            <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSelect("caregiver")}
          style={[styles.roleCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={[styles.iconBox, { backgroundColor: `${colors.accent}15` }]}>
            <Feather name="users" size={36} color={colors.accent} />
          </View>
          <Text style={[styles.roleTitle, { color: colors.foreground }]}>I'm a Caregiver</Text>
          <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>
            Monitor my patient's recovery, receive alerts, and coordinate care remotely
          </Text>
          <View style={[styles.selectBtn, { backgroundColor: colors.accent }]}>
            <Text style={[styles.selectText, { color: colors.primaryForeground }]}>Continue as Caregiver</Text>
            <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 20,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 36,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  cards: {
    gap: 16,
  },
  roleCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  roleTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  roleDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 50,
    marginTop: 4,
  },
  selectText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
