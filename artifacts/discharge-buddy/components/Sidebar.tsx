import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useSidebar } from "@/context/SidebarContext";
import { AnimPressable } from "@/components/AnimPressable";

const TEAL = "#0891b2";
const TEAL_DARK = "#0c4a6e";
const WHITE = "#ffffff";

const MENU_ITEMS = [
  { icon: "user" as const, label: "View Profile", route: "/profile" },
  { icon: "calendar" as const, label: "My Schedule", route: "/(tabs)/schedule" },
  { icon: "bell" as const, label: "Notifications", route: "/notifications" },
  { icon: "activity" as const, label: "Activity Log", route: "/(tabs)/symptoms" },
  { icon: "settings" as const, label: "Settings", route: "/settings" },
  { icon: "help-circle" as const, label: "Help & Feedback", route: null },
];

export function Sidebar() {
  const { isOpen, close, translateX, overlayOpacity, SIDEBAR_WIDTH } = useSidebar();
  const { user, role, setRole, setUser } = useApp();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const handleNav = (route: string | null) => {
    close();
    if (route) {
      setTimeout(() => router.push(route as any), 300);
    }
  };

  const handleLogout = () => {
    close();
    setTimeout(() => {
      setRole(null as any);
      setUser(null as any);
      router.replace("/login");
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={close}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.45)", opacity: overlayOpacity },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          { width: SIDEBAR_WIDTH, transform: [{ translateX }] },
        ]}
      >
        {/* Profile header — wave-style */}
        <View style={[styles.profileHeader, { paddingTop: topInset + 20 }]}>
          <TouchableOpacity onPress={close} style={styles.closeBtn}>
            <Feather name="x" size={20} color={WHITE} />
          </TouchableOpacity>

          <AnimPressable onPress={() => handleNav("/profile")} style={styles.avatarContainer}>
            <View style={styles.avatarLarge}>
              <Feather name={role === "caregiver" ? "users" : "user"} size={36} color={TEAL} />
            </View>
            <View style={styles.editBadge}>
              <Feather name="edit-2" size={11} color={WHITE} />
            </View>
          </AnimPressable>

          <Text style={styles.profileName}>{user?.name ?? "User"}</Text>
          <Text style={styles.profileRole}>{role === "caregiver" ? "Caregiver" : "Patient"}</Text>
        </View>

        {/* Wave divider */}
        <View style={styles.waveBottom} />

        {/* Menu items */}
        <View style={styles.menuList}>
          {MENU_ITEMS.map((item, i) => (
            <AnimPressable
              key={i}
              style={styles.menuItem}
              onPress={() => handleNav(item.route)}
            >
              <View style={styles.menuIconWrapper}>
                <Feather name={item.icon} size={18} color={TEAL} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Feather name="chevron-right" size={16} color="#94a3b8" />
            </AnimPressable>
          ))}
        </View>

        {/* Logout button */}
        <View style={[styles.logoutArea, { paddingBottom: bottomInset + 16 }]}>
          <AnimPressable style={styles.logoutBtn} onPress={handleLogout}>
            <Feather name="log-out" size={18} color={WHITE} />
            <Text style={styles.logoutText}>Log out</Text>
          </AnimPressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: WHITE,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },

  profileHeader: {
    backgroundColor: TEAL_DARK,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
    alignItems: "center",
  },
  closeBtn: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: WHITE,
  },
  profileName: {
    color: WHITE,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  profileRole: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },

  waveBottom: {
    height: 28,
    backgroundColor: TEAL_DARK,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 4,
  },

  menuList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 14,
    marginBottom: 2,
  },
  menuIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#1e293b",
  },

  logoutArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: TEAL_DARK,
    paddingVertical: 14,
    borderRadius: 14,
  },
  logoutText: {
    color: WHITE,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
