import { router } from "expo-router";
import { useApp } from "@/context/AppContext";
import { useEffect } from "react";
import { View } from "react-native";
import { DotLoader } from "@/components/DotLoader";

export default function EntryScreen() {
  const { isOnboarded, role, isInitializing } = useApp();

  useEffect(() => {
    console.log("[EntryScreen] State:", { isInitializing, isOnboarded, role });
    if (isInitializing) return;

    if (!isOnboarded) {
      console.log("[EntryScreen] Redirecting to /intro");
      router.replace("/intro");
      return;
    }

    if (!role) {
      console.log("[EntryScreen] Redirecting to /login");
      router.replace("/login");
      return;
    }

    console.log(`[EntryScreen] Redirecting to dashboard for role: ${role}`);
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
