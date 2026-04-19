import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useSegments } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useSidebar } from "@/context/SidebarContext";

const { width } = Dimensions.get("window");
const isSmall = width < 360;
const isWeb = Platform.OS === "web";
const PURPLE = "#6C47FF";
const PURPLE_LIGHT = "#EDE9FE";

// Responsive sizes
const TAB_ICON_SIZE = isSmall ? 20 : 22;
const TAB_LABEL_SIZE = isSmall ? 9 : 11;
const ICON_WRAP = isSmall ? 38 : 42;
const FAB_SIZE = isSmall ? 52 : 58;
const FAB_ICON = isSmall ? 23 : 26;

const shadow = (color: string, blur: number, y: number, opacity: number) =>
  isWeb
    ? { boxShadow: `0px ${y}px ${blur}px ${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}` }
    : {
        shadowColor: color,
        shadowOffset: { width: 0, height: y },
        shadowOpacity: opacity,
        shadowRadius: blur,
        elevation: blur,
      };

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

const FAB_ACTIONS = [
  { icon: "camera" as FeatherIconName, label: "Scan Rx", route: "/scan", color: PURPLE },
  { icon: "book-open" as FeatherIconName, label: "Journal", route: "/journal", color: "#A78BFA" },
  { icon: "heart" as FeatherIconName, label: "Card", route: "/emergency-card", color: "#EF4444" },
];

interface FloatingTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}
export function FloatingTabBar({ state, descriptors, navigation }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const { hapticsEnabled } = useApp();
  const { isOpen: isSidebarOpen } = useSidebar();
  const segments = useSegments();
  const [fabOpen, setFabOpen] = useState(false);

  // Hide if sidebar is open OR if we are in a root modal route (not in (tabs))
  const isTabRoute = segments[0] === "(tabs)";
  const isHidden = isSidebarOpen || !isTabRoute;
  const fabAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const bottomPad = Platform.OS === "web" ? 16 : Math.max(insets.bottom, 8);

  const fabOpenRef = useRef(fabOpen);
  fabOpenRef.current = fabOpen;

  const toggleFab = () => {
    const willOpen = !fabOpenRef.current;
    const toValue = willOpen ? 1 : 0;
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.parallel([
      Animated.spring(fabAnim, { toValue, useNativeDriver: !isWeb, tension: 130, friction: 8 }),
      Animated.timing(overlayAnim, { toValue, duration: 200, useNativeDriver: !isWeb }),
    ]).start();
    setFabOpen(willOpen);
  };

  const closeFab = () => {
    Animated.parallel([
      Animated.spring(fabAnim, { toValue: 0, useNativeDriver: !isWeb }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 150, useNativeDriver: !isWeb }),
    ]).start();
    setFabOpen(false);
  };

  const handleFabAction = (route: string) => {
    closeFab();
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => router.push(route as any), 100);
  };

  const fabRotation = fabAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] });

  const visibleRoutes = state.routes
    .map((route: any, index: number) => ({ route, index }))
    .filter((item: any) => descriptors[item.route.key].options.tabBarIcon !== undefined);

  const leftRoutes = visibleRoutes.slice(0, 2);
  const rightRoutes = visibleRoutes.slice(2);

  if (isHidden) return null;

  return (
    <>
      {/* Permanent Background Overlay to prevent animation abort */}
      <Animated.View
        style={[styles.overlay, { opacity: overlayAnim }]}
        pointerEvents={fabOpen ? "auto" : "none"}
      >
        <Pressable onPress={closeFab} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* FAB sub-actions — fan upward */}
      {FAB_ACTIONS.map((action, i) => {
        const angle = -90 + (i - 1) * 55; // wider spread
        const rad = (angle * Math.PI) / 180;
        const dist = isSmall ? 82 : 95;
        const tx = fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(rad) * dist] });
        const ty = fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(rad) * dist] });
        const sc = fabAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.7, 1] });
        const op = fabAnim.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] });

        return (
          <Animated.View
            key={action.label}
            style={[
              styles.fabAction,
              {
                bottom: bottomPad + FAB_SIZE / 2 + 8,
                transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }],
                opacity: op,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => handleFabAction(action.route)}
              style={[styles.fabActionBtn, { backgroundColor: action.color, width: isSmall ? 44 : 50, height: isSmall ? 44 : 50, borderRadius: isSmall ? 22 : 25 }, shadow("#000", 10, 5, 0.18)]}
              activeOpacity={0.85}
            >
              <Feather name={action.icon} size={isSmall ? 16 : 18} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.fabActionLabel} numberOfLines={1}>{action.label}</Text>
          </Animated.View>
        );
      })}

      {/* Main tab bar pill */}
      <View style={[styles.container, { paddingBottom: bottomPad }]} pointerEvents="box-none">
        <View style={[styles.pill, shadow("#6C47FF", 24, 8, 0.12)]}>
          <View style={styles.tabGroup}>
            {leftRoutes.map((item: any) => (
              <TabItem
                key={item.route.key}
                item={item}
                state={state}
                descriptors={descriptors}
                navigation={navigation}
                hapticsEnabled={hapticsEnabled}
              />
            ))}
          </View>

          {/* Center Spacer for FAB */}
          <View style={styles.fabSpacer} pointerEvents="none" />

          <View style={styles.tabGroup}>
            {rightRoutes.map((item: any) => (
              <TabItem
                key={item.route.key}
                item={item}
                state={state}
                descriptors={descriptors}
                navigation={navigation}
                hapticsEnabled={hapticsEnabled}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Center FAB rendered totally independently from container to fix Android touch bounds clipping completely */}
      <TouchableOpacity
        onPress={toggleFab}
        activeOpacity={0.9}
        style={[
          styles.fab,
          { width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2, bottom: bottomPad + (isSmall ? 18 : 22) },
          shadow(PURPLE, 16, 6, 0.45),
        ]}
      >
        <Animated.View style={{ transform: [{ rotate: fabRotation }] }}>
          <Feather name="plus" size={FAB_ICON} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    </>
  );
}

function TabItem({ item, state, descriptors, navigation, hapticsEnabled }: any) {
  const { route, index: actualIndex } = item;
  const { options } = descriptors[route.key];
  const label = options.tabBarLabel ?? options.title ?? route.name;
  const isFocused = state.index === actualIndex;
  const tabScale = useRef(new Animated.Value(1)).current;

  const onPress = () => {
    Animated.sequence([
      Animated.spring(tabScale, { toValue: 0.82, useNativeDriver: true, friction: 8 }),
      Animated.spring(tabScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabItem}
      activeOpacity={1}
      hitSlop={{ top: 6, bottom: 6 }}
    >
      <Animated.View style={{ transform: [{ scale: tabScale }], alignItems: "center" }}>
        <View style={[
          styles.tabIconWrap,
          { width: ICON_WRAP, height: ICON_WRAP, borderRadius: 100 },
          isFocused && { backgroundColor: PURPLE_LIGHT },
        ]}>
          {options.tabBarIcon?.({ color: isFocused ? PURPLE : "#9CA3AF", size: TAB_ICON_SIZE })}
        </View>
        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? PURPLE : "#9CA3AF",
              fontFamily: isFocused ? "Inter_700Bold" : "Inter_500Medium",
              fontSize: TAB_LABEL_SIZE,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {isFocused && <View style={styles.activeDot} />}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    alignItems: "center", paddingHorizontal: isSmall ? 10 : 16,
  },
  pill: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 50,
    paddingHorizontal: 6, paddingVertical: isSmall ? 6 : 8,
    width: "100%", maxWidth: 430,
  },
  tabGroup: { flex: 1, flexDirection: "row" },
  tabItem: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: isSmall ? 6 : 8, gap: 3,
  },
  tabIconWrap: {
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  tabLabel: {
    textAlign: "center",
    includeFontPadding: false,
  },
  activeDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: PURPLE,
    marginTop: 2,
  },
  fabSpacer: { 
    width: FAB_SIZE + (isSmall ? 8 : 12),
  },
  fab: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: PURPLE,
    alignItems: "center", justifyContent: "center",
    zIndex: 10,
  },
  fabAction: {
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
    left: "50%",
    marginLeft: isSmall ? -22 : -25,
  },
  fabActionBtn: {
    alignItems: "center", justifyContent: "center",
  },
  fabActionLabel: {
    marginTop: 5,
    fontSize: isSmall ? 9 : 10,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    maxWidth: isSmall ? 44 : 52,
    textAlign: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(14,10,35,0.38)",
  },
});
