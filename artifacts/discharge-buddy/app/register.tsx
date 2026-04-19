import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";

const TEAL = "#0891b2";
const TEAL_DARK = "#0c4a6e";
const WHITE = "#ffffff";
const INPUT_BG = "#f0f9ff";
const INPUT_BORDER = "#bae6fd";
const MUTED = "#64748b";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [role, setRoleState] = useState<"patient" | "caregiver">("patient");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const handleRegister = async () => {
    try {
      if (!fullName || !email) {
        alert("Please fill in all fields");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: fullName, role })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Registration failed");
      }

      const data = await res.json();
      await login(data.user, data.token);
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("Register Error", err);
      alert(err.message || "Failed to register");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Teal wave header */}
        <View style={[styles.header, { paddingTop: topInset + 24 }]}>
          <TouchableOpacity 
            onPress={() => router.canGoBack() ? router.back() : router.replace("/login")} 
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={20} color={WHITE} />
          </TouchableOpacity>

          {/* Decorative cross */}
          <View style={styles.decorativeCross}>
            <Feather name="plus" size={28} color="rgba(255,255,255,0.25)" />
          </View>
          <View style={styles.decorativeCross2}>
            <Feather name="heart" size={18} color="rgba(255,255,255,0.2)" />
          </View>

          <Text style={styles.headerTitle}>Register</Text>
          <Text style={styles.headerSubtitle}>Create your new account</Text>
        </View>

        <View style={styles.waveDivider} />

        {/* Form */}
        <View style={[styles.formCard, { paddingBottom: bottomInset + 24 }]}>
          {/* Role toggle */}
          <View style={styles.roleToggle}>
            <TouchableOpacity
              onPress={() => setRoleState("patient")}
              style={[styles.roleBtn, role === "patient" && styles.roleBtnActive]}
            >
              <Feather name="user" size={14} color={role === "patient" ? WHITE : TEAL} />
              <Text style={[styles.roleBtnText, { color: role === "patient" ? WHITE : TEAL }]}>Patient</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setRoleState("caregiver")}
              style={[styles.roleBtn, role === "caregiver" && styles.roleBtnActive]}
            >
              <Feather name="users" size={14} color={role === "caregiver" ? WHITE : TEAL} />
              <Text style={[styles.roleBtnText, { color: role === "caregiver" ? WHITE : TEAL }]}>Caregiver</Text>
            </TouchableOpacity>
          </View>

          {/* Full Name */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputIcon}>
              <Feather name="user" size={18} color={TEAL} />
            </View>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Full Name"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
          </View>

          {/* Email */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputIcon}>
              <Feather name="mail" size={18} color={TEAL} />
            </View>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="user@mail.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            {email.includes("@") && (
              <View style={styles.validIcon}>
                <Feather name="check" size={16} color="#10b981" />
              </View>
            )}
          </View>

          {/* Password */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputIcon}>
              <Feather name="lock" size={18} color={TEAL} />
            </View>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showPassword}
              style={[styles.input, { paddingRight: 44 }]}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Feather name={showPassword ? "eye" : "eye-off"} size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Remember + Forgot */}
          <View style={styles.rememberRow}>
            <TouchableOpacity onPress={() => setRemember(!remember)} style={styles.checkRow}>
              <View style={[styles.checkbox, { backgroundColor: remember ? TEAL : "transparent" }]}>
                {remember && <Feather name="check" size={11} color={WHITE} />}
              </View>
              <Text style={styles.rememberText}>Remember Me</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={[styles.forgotText, { color: TEAL }]}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Register button */}
          <TouchableOpacity onPress={handleRegister} style={styles.loginBtn} activeOpacity={0.85}>
            <Text style={styles.loginBtnText}>Create Account</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn}>
              <Text style={styles.socialIconG}>G</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <Feather name="github" size={20} color="#1a1a1a" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <Feather name="smartphone" size={20} color="#1a1a1a" />
            </TouchableOpacity>
          </View>

          {/* Login link */}
          <View style={styles.signupRow}>
            <Text style={styles.signupLabel}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text style={[styles.signupLink, { color: TEAL }]}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },

  header: {
    backgroundColor: TEAL_DARK,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  decorativeCross: {
    position: "absolute",
    top: 60,
    right: 40,
  },
  decorativeCross2: {
    position: "absolute",
    top: 100,
    right: 80,
  },
  headerTitle: {
    color: WHITE,
    fontSize: 30,
    fontFamily: "Inter_700Bold",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
  },

  waveDivider: {
    height: 40,
    backgroundColor: TEAL_DARK,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },

  formCard: {
    flex: 1,
    backgroundColor: WHITE,
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 14,
  },

  roleToggle: {
    flexDirection: "row",
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    padding: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
  },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
  },
  roleBtnActive: { backgroundColor: TEAL },
  roleBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: INPUT_BORDER,
    overflow: "hidden",
  },
  inputIcon: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#0f172a",
    paddingVertical: 14,
    paddingRight: 14,
  },
  eyeBtn: { position: "absolute", right: 14, top: 14 },
  validIcon: { position: "absolute", right: 14, top: 14 },

  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
  },
  rememberText: { fontSize: 13, fontFamily: "Inter_400Regular", color: MUTED },
  forgotText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  loginBtn: {
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnText: { color: WHITE, fontSize: 16, fontFamily: "Inter_600SemiBold" },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  dividerText: { fontSize: 12, fontFamily: "Inter_400Regular", color: MUTED },

  socialRow: { flexDirection: "row", justifyContent: "center", gap: 16 },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: INPUT_BG,
    borderWidth: 1.5,
    borderColor: INPUT_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  socialIconG: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#ea4335" },

  signupRow: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  signupLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: MUTED },
  signupLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
