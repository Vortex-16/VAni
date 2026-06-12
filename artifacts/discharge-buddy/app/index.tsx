import { router } from "expo-router";
import { useApp } from "@/context/AppContext";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { DotLoader } from "../components/DotLoader";

export default function EntryScreen() {
  const { isOnboarded, role, isInitializing } = useApp();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    console.log("[EntryScreen] State:", { isInitializing, isOnboarded, role });
    if (isInitializing) return;
    // Prevent double-navigation (e.g. login screen fires router.replace before this effect runs again)
    if (hasNavigatedRef.current) return;

    if (!isOnboarded) {
      console.log("[EntryScreen] Redirecting to /intro");
      hasNavigatedRef.current = true;
      router.replace("/intro");
      return;
    }

    if (!role) {
      console.log("[EntryScreen] Redirecting to /login");
      hasNavigatedRef.current = true;
      router.replace("/login");
      return;
    }

    console.log(`[EntryScreen] Redirecting to dashboard for role: ${role}`);
    hasNavigatedRef.current = true;
    if (role === 'family') {
      router.replace("/family/dashboard");
      return;
    }

    if (role === 'caregiver') {
      router.replace("/caregiver/dashboard");
      return;
    }

    router.replace("/(tabs)");
  }, [isInitializing, isOnboarded, role]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F4FB' }}>
      <DotLoader size={12} color="#6C47FF" />
    </View>
  );
}
