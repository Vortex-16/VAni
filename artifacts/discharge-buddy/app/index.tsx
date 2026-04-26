import { Redirect } from "expo-router";
import { useApp } from "@/context/AppContext";

export default function EntryScreen() {
  const { isOnboarded, role, isInitializing } = useApp();

  if (isInitializing) {
    return null; // Or a splash screen component
  }

  if (!isOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  if (!role) {
    return <Redirect href="/login" />;
  }

  if (role === 'caregiver') {
    return <Redirect href="/caregiver/dashboard" />;
  }

  return <Redirect href="/(tabs)" />;
}
