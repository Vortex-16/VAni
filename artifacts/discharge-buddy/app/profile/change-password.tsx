import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";

const VIOLET = "#8b5cf6";
const VIOLET_DARK = "#4c1d95";
const WHITE = "#ffffff";

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const { changePassword } = useApp();
  
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setErrorMsg(null);
    
    if (!oldPassword || !newPassword || !confirmPassword) {
      setErrorMsg("Please fill all fields");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await changePassword(oldPassword, newPassword);
      setSuccess(true);
      setTimeout(() => router.back(), 1500);
    } catch (err) {
      console.error("Password change error:", err);
      setErrorMsg("Incorrect current password or update failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <View style={styles.successCircle}>
          <Feather name="check" size={40} color={WHITE} />
        </View>
        <Text style={styles.successTitle}>Password Updated!</Text>
        <Text style={styles.successSub}>Taking you back...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={WHITE} />
          </Pressable>
          <Text style={styles.headerTitle}>Change Password</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.infoBox}>
          <Feather name="shield" size={24} color={VIOLET} />
          <Text style={styles.infoText}>
            Ensure your new password is secure and at least 6 characters long.
          </Text>
        </View>

        <View style={styles.form}>
          {errorMsg && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CURRENT PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry={!showOld}
                placeholder="••••••••"
              />
              <Pressable onPress={() => setShowOld(!showOld)} style={styles.eyeBtn}>
                <Feather name={showOld ? "eye-off" : "eye"} size={18} color="#94a3b8" />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>NEW PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
                placeholder="••••••••"
              />
              <Pressable onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                <Feather name={showNew ? "eye-off" : "eye"} size={18} color="#94a3b8" />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="••••••••"
              />
            </View>
          </View>

          <Pressable 
            style={({ pressed }) => [
              styles.submitBtn, 
              loading && { opacity: 0.7 },
              pressed && { opacity: 0.9 }
            ]} 
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.submitText}>{loading ? "Updating..." : "Update Password"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },
  header: {
    backgroundColor: VIOLET_DARK,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: WHITE,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#f5f3ff",
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#5b21b6",
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  form: {
    paddingHorizontal: 20,
    gap: 20,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#94a3b8",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#1e293b",
  },
  eyeBtn: {
    paddingHorizontal: 14,
  },
  submitBtn: {
    backgroundColor: VIOLET,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: "center",
    marginTop: 10,
  },
  submitText: {
    color: WHITE,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#1e293b",
  },
  successSub: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 8,
  },
});
