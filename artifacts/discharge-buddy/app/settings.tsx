import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";

const TEAL = "#0891b2";
const TEAL_DARK = "#0c4a6e";
const WHITE = "#ffffff";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { logout, hapticsEnabled, setHapticsEnabled } = useApp();
  const [notifications, setNotifications] = useState(true);
  const [appNotifs, setAppNotifs] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    logout();
  };

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
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity style={styles.backBtn}>
            <Feather name="moon" size={20} color={WHITE} />
          </TouchableOpacity>
        </View>
        <View style={styles.waveDivider} />

        {/* Account section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${TEAL}15` }]}>
              <Feather name="user" size={20} color={TEAL} />
            </View>
            <Text style={styles.sectionTitle}>Account</Text>
          </View>

          {[
            { label: "Edit Profile", icon: "edit" as const },
            { label: "Change Password", icon: "lock" as const },
            { label: "Connect Social", icon: "link" as const },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={styles.row}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Feather name="chevron-right" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Notifications section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: "#f59e0b20" }]}>
              <Feather name="bell" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Dose Reminders</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#e2e8f0", true: `${TEAL}60` }}
              thumbColor={notifications ? TEAL : "#cbd5e1"}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>App Notifications</Text>
            <Switch
              value={appNotifs}
              onValueChange={setAppNotifs}
              trackColor={{ false: "#e2e8f0", true: `${TEAL}60` }}
              thumbColor={appNotifs ? TEAL : "#cbd5e1"}
            />
          </View>
        </View>

        {/* Display section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: "#8b5cf620" }]}>
              <Feather name="monitor" size={20} color="#8b5cf6" />
            </View>
            <Text style={styles.sectionTitle}>Display</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Dark Mode</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#e2e8f0", true: "#8b5cf640" }}
              thumbColor={darkMode ? "#8b5cf6" : "#cbd5e1"}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Haptic Feedback</Text>
            <Switch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              trackColor={{ false: "#e2e8f0", true: "#8b5cf640" }}
              thumbColor={hapticsEnabled ? "#8b5cf6" : "#cbd5e1"}
            />
          </View>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Language</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>English</Text>
              <Feather name="chevron-right" size={18} color="#94a3b8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* More section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: "#10b98120" }]}>
              <Feather name="map" size={20} color="#10b981" />
            </View>
            <Text style={styles.sectionTitle}>More</Text>
          </View>

          {[
            { label: "Privacy Policy", icon: "shield" as const },
            { label: "Terms of Service", icon: "file-text" as const },
            { label: "About DischargeBuddy", icon: "info" as const },
            { label: "Rate the App", icon: "star" as const },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={styles.row}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Feather name="chevron-right" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout button */}
        <View style={styles.logoutSection}>
          <View style={[styles.sectionHeader, { marginBottom: 0 }]}>
            <View style={[styles.sectionIcon, { backgroundColor: "#ef444420" }]}>
              <Feather name="log-out" size={20} color="#ef4444" />
            </View>
            <TouchableOpacity onPress={handleLogout} style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: "#ef4444" }]}>Logout</Text>
            </TouchableOpacity>
          </View>
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
  waveDivider: {
    height: 28,
    backgroundColor: TEAL_DARK,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 16,
  },

  section: {
    marginHorizontal: 18,
    marginBottom: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: WHITE,
    marginBottom: 0,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#0f172a",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#334155",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowValue: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#94a3b8",
  },

  logoutSection: {
    marginHorizontal: 18,
    backgroundColor: "#fff5f5",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
    overflow: "hidden",
    paddingVertical: 4,
  },
});
