import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { getApiUrl } from "@/utils/apiUrl";

const PRIMARY = "#7C3AED";
const PRIMARY_DARK = "#6D28D9";
const WHITE = "#FFFFFF";
const MUTED = "#94A3B8";
const TEXT = "#1E293B";

type Step = "email" | "otp";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleSendOTP = async () => {
    if (!email.trim()) { setError("Please enter your email address"); return; }
    setLoading(true); setError(null);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "USE_GOOGLE_SIGNIN") {
          Alert.alert("Use Google Sign-In", data.message);
          return;
        }
        throw new Error(data.error || "Failed to send reset code");
      }
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("otp");
      setResendTimer(60);
    } catch (err: any) {
      setError(err.message);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (text: string, index: number) => {
    setError(null);
    const next = [...code];
    next[index] = text.slice(-1);
    setCode(next);
    if (text && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResetPassword = async () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) { setError("Enter the complete 6-digit code"); return; }
    if (!newPassword) { setError("Enter a new password"); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true); setError(null);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: fullCode, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Password Reset!", "Your password has been updated. Please sign in.", [
        { text: "Sign In", onPress: () => router.replace("/login") },
      ]);
    } catch (err: any) {
      setError(err.message);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setResendTimer(60);
    await handleSendOTP();
  };

  const topPad = Platform.OS === "web" ? 0 : insets.top;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[PRIMARY_DARK, PRIMARY]}
        start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 20 }]}
      >
        <TouchableOpacity onPress={() => router.replace("/login")} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === "email" ? "Forgot Password?" : "Reset Password"}
        </Text>
        <Text style={styles.headerSub}>
          {step === "email"
            ? "Enter your email to receive a reset code."
            : `Enter the 6-digit code sent to ${email}`}
        </Text>
      </LinearGradient>

      <View style={styles.card}>
        {!!error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {step === "email" ? (
          <>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrap}>
              <Feather name="mail" size={18} color={MUTED} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoFocus
                returnKeyType="send"
                onSubmitEditing={handleSendOTP}
              />
            </View>

            <TouchableOpacity
              onPress={handleSendOTP}
              disabled={loading}
              activeOpacity={0.85}
              style={styles.primaryBtn}
            >
              <LinearGradient
                colors={[PRIMARY, PRIMARY_DARK]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.primaryBtnGrad}
              >
                {loading
                  ? <ActivityIndicator color={WHITE} size="small" />
                  : <><Text style={styles.primaryBtnText}>SEND RESET CODE</Text><Feather name="send" size={18} color={WHITE} /></>
                }
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.otpRow}>
              {code.map((val, idx) => (
                <TextInput
                  key={idx}
                  ref={(r) => { if (r) inputRefs.current[idx] = r; }}
                  style={[styles.otpInput, val ? styles.otpInputActive : null]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={val}
                  onChangeText={(t) => handleTextChange(t, idx)}
                  onKeyPress={(e) => handleKeyPress(e, idx)}
                  autoFocus={idx === 0}
                />
              ))}
            </View>

            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputWrap}>
              <Feather name="lock" size={18} color={MUTED} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="At least 6 characters"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={MUTED} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Confirm New Password</Text>
            <View style={styles.inputWrap}>
              <Feather name="lock" size={18} color={MUTED} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="Repeat password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleResetPassword}
              />
            </View>

            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.85}
              style={[styles.primaryBtn, { marginTop: 20 }]}
            >
              <LinearGradient
                colors={[PRIMARY, PRIMARY_DARK]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.primaryBtnGrad}
              >
                {loading
                  ? <ActivityIndicator color={WHITE} size="small" />
                  : <><Text style={styles.primaryBtnText}>RESET PASSWORD</Text><Feather name="check" size={18} color={WHITE} /></>
                }
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              {resendTimer > 0
                ? <Text style={styles.timerText}>Resend in {resendTimer}s</Text>
                : <TouchableOpacity onPress={handleResend}><Text style={styles.resendLink}>Resend Code</Text></TouchableOpacity>
              }
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 24, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 26, color: WHITE, marginBottom: 4 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 20 },
  card: { flex: 1, marginHorizontal: 24, marginTop: -20, backgroundColor: WHITE, borderRadius: 24, padding: 24, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 8 },
  errorBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FEE2E2", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, width: "100%", marginBottom: 16 },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#EF4444", flex: 1 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: TEXT, marginBottom: 8 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14, backgroundColor: "#F8FAFC", paddingHorizontal: 14, marginBottom: 8, height: 52 },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: TEXT },
  primaryBtn: { width: "100%", height: 52, borderRadius: 26, overflow: "hidden", marginTop: 8, marginBottom: 20 },
  primaryBtnGrad: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: WHITE, letterSpacing: 0.5 },
  otpRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 24 },
  otpInput: { width: 45, height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", fontFamily: "Inter_700Bold", fontSize: 22, color: "#0F172A", textAlign: "center" },
  otpInputActive: { borderColor: PRIMARY, backgroundColor: "#F5F3FF" },
  resendRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 4 },
  resendText: { fontFamily: "Inter_400Regular", fontSize: 14, color: MUTED },
  resendLink: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: PRIMARY },
  timerText: { fontFamily: "Inter_500Medium", fontSize: 14, color: MUTED },
});
