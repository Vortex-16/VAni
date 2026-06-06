import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import { getApiUrl } from '@/utils/apiUrl';

const PRIMARY = "#7C3AED";
const PRIMARY_DARK = "#6D28D9";
const WHITE = "#FFFFFF";
const MUTED = "#94A3B8";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [error, setError] = useState<string | null>(null);

  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleTextChange = (text: string, index: number) => {
    setError(null);
    const newCode = [...code];
    newCode[index] = text.slice(-1); // Only keep the last character
    setCode(newCode);

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      setError("Please enter the complete 6-digit code");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsVerifying(true);
    setError(null);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Verification failed");
      }

      const data = await res.json();

      // Store token and log in user
      await login(data.user, data.token);

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("✅ Verified!", "Your email has been successfully verified.");

      // Route to appropriate dashboard
      const dest = data.user.role === 'caregiver'
        ? '/caregiver/dashboard'
        : data.user.role === 'family'
          ? '/family/dashboard'
          : '/(tabs)';
      router.replace(dest as any);
    } catch (err: any) {
      setError(err.message || "Failed to verify email");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0 || isResending) return;

    setIsResending(true);
    setError(null);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resend code");
      }

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Code Sent", "A new verification code has been sent to your email.");
      setResendTimer(30);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    } finally {
      setIsResending(false);
    }
  };

  const topPad = Platform.OS === "web" ? 0 : insets.top;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[PRIMARY_DARK, PRIMARY]}
        start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 20 }]}
      >
        <TouchableOpacity onPress={() => router.replace("/login")} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Email</Text>
        <Text style={styles.headerSub}>We sent a verification code to your email.</Text>
      </LinearGradient>

      {/* Main card */}
      <View style={styles.card}>
        <Text style={styles.emailText}>{email}</Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.instructions}>Enter the 6-digit OTP code below to activate your account.</Text>

        {/* OTP Input Boxes */}
        <View style={styles.otpRow}>
          {code.map((val, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => {
                if (ref) inputRefs.current[idx] = ref;
              }}
              style={[
                styles.otpInput,
                code[idx] ? styles.otpInputActive : null
              ]}
              keyboardType="number-pad"
              maxLength={1}
              value={val}
              onChangeText={(text) => handleTextChange(text, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              autoFocus={idx === 0}
            />
          ))}
        </View>

        {/* Verify button */}
        <TouchableOpacity
          onPress={handleVerify}
          disabled={isVerifying}
          activeOpacity={0.85}
          style={styles.primaryBtn}
        >
          <LinearGradient
            colors={[PRIMARY, PRIMARY_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryBtnGrad}
          >
            {isVerifying ? (
              <ActivityIndicator color={WHITE} size="small" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>VERIFY ACCOUNT</Text>
                <Feather name="check" size={18} color={WHITE} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Resend details */}
        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Didn't receive the code? </Text>
          {resendTimer > 0 ? (
            <Text style={styles.timerText}>Resend in {resendTimer}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResendCode} disabled={isResending}>
              <Text style={styles.resendLink}>{isResending ? "Resending..." : "Resend Code"}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: WHITE,
    marginBottom: 4,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  card: {
    flex: 1,
    marginHorizontal: 24,
    marginTop: -20,
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    alignItems: "center",
  },
  emailText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: PRIMARY,
    marginBottom: 16,
    textAlign: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: "100%",
    marginBottom: 16,
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#EF4444",
  },
  instructions: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: MUTED,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 32,
  },
  otpInput: {
    width: 45,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#0F172A",
    textAlign: "center",
  },
  otpInputActive: {
    borderColor: PRIMARY,
    backgroundColor: "#F5F3FF",
  },
  primaryBtn: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    marginBottom: 20,
  },
  primaryBtnGrad: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: WHITE,
    letterSpacing: 0.5,
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  resendText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: MUTED,
  },
  resendLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: PRIMARY,
  },
  timerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: MUTED,
  },
});
