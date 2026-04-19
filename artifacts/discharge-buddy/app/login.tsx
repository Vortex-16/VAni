import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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

const PINK = "#e91e8c";
const PINK_DARK = "#c2185b";
const PINK_LIGHT = "#f06292";
const WHITE = "#ffffff";
const MUTED = "#94a3b8";
const INPUT_BG = "#fdf0f7";
const INPUT_BORDER = "#f8b4d9";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, setRole, setUser } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRoleState] = useState<"patient" | "caregiver">("patient");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 24 : insets.bottom;

  const handleGuestLogin = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRole(role);
    setUser({
      id: Date.now().toString(),
      name: "Guest " + role,
      email: "test@example.com",
      role,
    });
    router.replace("/(tabs)");
  };

  const handleLogin = async () => {
    try {
      if (!email) {
        alert("Please enter your email");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Login failed");
      }

      const data = await res.json();
      await login(data.user, data.token);
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("Login Error", err);
      alert(err.message || "Failed to connect to API backend");
    }
  };

  const handleDevLogin = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${apiUrl}/api/auth/dev-session`);

      if (!res.ok) {
        throw new Error("Dev session failed");
      }

      const data = await res.json();
      await login(data.user, data.token);
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("Dev Login Error", err);
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      alert(`Dev session failed: ${err.message}\nChecked URL: ${apiUrl}/api/auth/dev-session\nEnsure backend is running and the IP matches your network.`);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: WHITE }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Gradient hero ── */}
        <LinearGradient
          colors={[PINK_DARK, PINK, PINK_LIGHT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: topInset + 40 }]}
        >
          {/* Decorative circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
          <View style={styles.decorCircle3} />

          {/* Logo */}
          <View style={styles.logoCircle}>
            <Feather name="activity" size={36} color={PINK} />
          </View>

          <Text style={styles.appName}>DischargeBuddy</Text>
          <Text style={styles.heroSubtitle}>Your recovery companion</Text>
        </LinearGradient>

        {/* ── Wave curve ── */}
        <View style={styles.waveContainer}>
          <LinearGradient
            colors={[PINK_LIGHT, PINK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.waveBg}
          />
          <View style={styles.waveWhite} />
        </View>

        {/* ── Form ── */}
        <View style={[styles.form, { paddingBottom: bottomInset + 32 }]}>
          <Text style={styles.welcomeTitle}>Welcome Back</Text>
          <Text style={styles.welcomeSub}>Login to continue your recovery journey</Text>

          {/* Role toggle */}
          <View style={styles.roleRow}>
            {(["patient", "caregiver"] as const).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRoleState(r)}
                style={[styles.roleChip, role === r && styles.roleChipActive]}
                activeOpacity={0.8}
              >
                <Feather
                  name={r === "patient" ? "user" : "users"}
                  size={13}
                  color={role === r ? WHITE : PINK}
                />
                <Text style={[styles.roleChipText, { color: role === r ? WHITE : PINK }]}>
                  {r === "patient" ? "Patient" : "Caregiver"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Email */}
          <View style={[styles.inputBox, emailFocused && styles.inputBoxFocused]}>
            <Feather name="mail" size={18} color={emailFocused ? PINK : MUTED} style={styles.inputIcon} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email or username"
              placeholderTextColor={MUTED}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </View>

          {/* Password */}
          <View style={[styles.inputBox, passwordFocused && styles.inputBoxFocused]}>
            <Feather name="lock" size={18} color={passwordFocused ? PINK : MUTED} style={styles.inputIcon} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={MUTED}
              secureTextEntry={!showPassword}
              style={[styles.input, { paddingRight: 44 }]}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              <Feather name={showPassword ? "eye" : "eye-off"} size={18} color={MUTED} />
            </TouchableOpacity>
          </View>

          {/* Forgot */}
          <TouchableOpacity style={styles.forgotRow}>
            <Text style={[styles.forgotText, { color: PINK }]}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login button */}
          <TouchableOpacity onPress={handleLogin} activeOpacity={0.85}>
            <LinearGradient
              colors={[PINK_DARK, PINK, PINK_LIGHT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginBtn}
            >
              <Text style={styles.loginBtnText}>LOG IN</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Guest login */}
          <TouchableOpacity
            onPress={handleGuestLogin}
            style={styles.guestBtn}
            activeOpacity={0.8}
          >
            <Text style={[styles.guestBtnText, { color: PINK }]}>GUEST LOG IN (OFFLINE)</Text>
          </TouchableOpacity>

          {/* Developer Shortcut (Visible in Dev) */}
          {__DEV__ && (
            <TouchableOpacity onPress={handleDevLogin} style={styles.devBtn}>
              <Feather name="code" size={16} color={PINK} />
              <Text style={styles.devBtnText}>DEVELOPER QUICK START</Text>
            </TouchableOpacity>
          )}

          {/* Sign up */}
          <View style={styles.signupRow}>
            <Text style={styles.signupLabel}>Don't have an account?  </Text>
            <TouchableOpacity onPress={() => router.replace("/register")}>
              <Text style={[styles.signupLink, { color: PINK }]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Decorative dots */}
          <View style={styles.dots}>
            {[PINK, "#fbbf24", "#f472b6", PINK_LIGHT, "#fbbf24"].map((c, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: c, width: i % 2 === 0 ? 8 : 12, height: i % 2 === 0 ? 8 : 12 }]} />
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    paddingBottom: 50,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  decorCircle1: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -40,
    right: -40,
  },
  decorCircle2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: 20,
    left: -20,
  },
  decorCircle3: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.1)",
    top: 60,
    right: 40,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  appName: {
    color: WHITE,
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },

  waveContainer: {
    height: 44,
    overflow: "hidden",
  },
  waveBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 44,
  },
  waveWhite: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: WHITE,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
  },

  form: {
    backgroundColor: WHITE,
    paddingHorizontal: 28,
    paddingTop: 4,
    gap: 14,
  },
  welcomeTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#1a1a2e",
    textAlign: "center",
    marginBottom: 2,
  },
  welcomeSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: MUTED,
    textAlign: "center",
    marginBottom: 4,
  },

  roleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  roleChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: PINK,
    backgroundColor: INPUT_BG,
  },
  roleChipActive: {
    backgroundColor: PINK,
    borderColor: PINK,
  },
  roleChipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },

  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: INPUT_BORDER,
    overflow: "hidden",
  },
  inputBoxFocused: {
    borderColor: PINK,
    backgroundColor: "#fff",
  },
  inputIcon: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#1a1a2e",
    paddingVertical: 14,
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 14,
  },

  forgotRow: {
    alignItems: "flex-end",
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  loginBtn: {
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  loginBtnText: {
    color: WHITE,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },

  guestBtn: {
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: PINK,
  },
  guestBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },

  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
  },
  signupLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: MUTED,
  },
  signupLink: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  devBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: `${PINK}08`,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${PINK}20`,
    borderStyle: "dashed",
    marginTop: 8,
  },
  devBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: PINK,
    letterSpacing: 1,
  },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    opacity: 0.5,
  },
  dot: {
    borderRadius: 10,
  },
});
