import { Audio } from 'expo-av';
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Modal,
  StatusBar,
} from 'react-native';
import { TranslateText as Text } from '@/components/TranslateText';
import { useSharedValue, useAnimatedStyle, withSequence, withRepeat, withTiming } from "react-native-reanimated";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { MockProvider } from "@/context/MockProvider";
import { LiquidCapsuleProgress } from "@/components/LiquidCapsuleProgress";
import { getFriendlyErrorMessage } from '@/utils/errorUtils';
import { BlurView } from 'expo-blur';

const PRIMARY      = "#7C3AED";
const PRIMARY_DARK = "#5B21B6";
const WHITE        = "#FFFFFF";
const MUTED        = "#94A3B8";
const SOFT_BG      = "#F5F3FF";
const INPUT_BG     = "#F8FAFC";
const TEXT_DARK    = "#1E1B4B";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

// ── Decorative prescription lines in the header ───────────────────────────────
function RxDecor() {
  return (
    <View style={decor.wrap} pointerEvents="none">
      {/* Rx symbol */}
      <Text style={decor.rx}>℞</Text>
      {/* Pill capsule shapes */}
      <View style={decor.capsuleRow}>
        <View style={[decor.capsule, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
        <View style={[decor.capsule, { backgroundColor: 'rgba(255,255,255,0.07)', width: 32 }]} />
      </View>
      {/* Cross / plus signs */}
      <View style={[decor.cross, { top: 24, right: 28 }]}>
        <Feather name="plus" size={28} color="rgba(255,255,255,0.1)" />
      </View>
      <View style={[decor.cross, { bottom: 30, left: 20 }]}>
        <Feather name="plus" size={16} color="rgba(255,255,255,0.08)" />
      </View>
      {/* Heart-pulse icon faint */}
      <View style={decor.pulse}>
        <Feather name="activity" size={48} color="rgba(255,255,255,0.06)" />
      </View>
    </View>
  );
}

const decor = StyleSheet.create({
  wrap:      { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  rx:        { position: 'absolute', top: 18, left: 24, fontSize: 52, color: 'rgba(255,255,255,0.08)', fontWeight: '900' },
  capsuleRow:{ position: 'absolute', bottom: 24, right: 16, flexDirection: 'row', gap: 6 },
  capsule:   { width: 52, height: 22, borderRadius: 11 },
  cross:     { position: 'absolute' },
  pulse:     { position: 'absolute', bottom: 16, left: '38%' },
});

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, setRole, setUser, switchProvider, resetOnboarding } = useApp();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role,         setRoleState]    = useState<"patient" | "caregiver" | "family">("patient");
  const [emailFocused,    setEmailFocused]    = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error,  setError]  = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);

  const [isLoggingIn,   setIsLoggingIn]   = useState(false);
  const [loginProgress, setLoginProgress] = useState(0);
  const [isSuccess,     setIsSuccess]     = useState(false);

  const passwordRef = React.useRef<TextInput>(null);

  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const shake = () => {
    shakeX.value = withSequence(
      withTiming(-8, { duration: 45 }),
      withRepeat(withTiming(8, { duration: 45 }), 4, true),
      withTiming(0, { duration: 45 })
    );
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const handleTransitionToSuccess = async () => {
    setIsSuccess(true);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const { sound } = await Audio.Sound.createAsync(require("../assets/sounds/notification.mp3"));
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((s) => { if (s.isLoaded && s.didJustFinish) sound.unloadAsync().catch(() => {}); });
    } catch {}
    setTimeout(() => {
      const path = role === "caregiver" ? "/caregiver/dashboard" : role === "family" ? "/family/dashboard" : "/(tabs)";
      router.replace(path as any);
    }, 600);
  };

  const handleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    if (!email || !password) { setError("Please enter both email and password"); shake(); return; }
    setIsLoggingIn(true);
    setLoginProgress(0.8);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Login failed"); }
      const data = await res.json();
      await login(data.user, data.token);
      setLoginProgress(1);
      setTimeout(handleTransitionToSuccess, 100);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err, 'auth'));
      setIsLoggingIn(false); setLoginProgress(0);
      shake();
    }
  };

  const handleGuestLogin = async () => {
    const AS = (await import("@react-native-async-storage/async-storage")).default;
    await AS.removeItem("discharge_buddy_token");
    setIsLoggingIn(true); setLoginProgress(0.8);
    setTimeout(async () => {
      setRole(role);
      setUser({ id: Date.now().toString(), name: "Guest " + role, email: "test@example.com", role });
      setLoginProgress(1);
      setTimeout(handleTransitionToSuccess, 100);
    }, 300);
  };

  const runDemo = async (demoRole: "patient" | "caregiver" | "family") => {
    setShowDemoModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsLoggingIn(true); setLoginProgress(0.8);
    try {
      const AS = (await import("@react-native-async-storage/async-storage")).default;
      await AS.removeItem("discharge_buddy_token");
      const { MockProvider: MP } = await import("@/context/MockProvider");
      switchProvider(new MP());
      setRole(demoRole);
      setUser({ id: "demo-user", name: demoRole === "caregiver" ? "Demo Caregiver" : demoRole === "family" ? "Demo Family" : "Demo Patient", email: "demo@dischargebuddy.app", role: demoRole });
      setLoginProgress(1);
      setTimeout(handleTransitionToSuccess, 100);
    } catch { setIsLoggingIn(false); setLoginProgress(0); }
  };

  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const botPad = Platform.OS === "web" ? 24 : insets.bottom;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle="light-content" />

      {/* ── Purple Header Block ── */}
      <LinearGradient
        colors={[PRIMARY_DARK, PRIMARY]}
        start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 28 }]}
      >
        <RxDecor />
        <View style={styles.logoRow}>
          <View style={styles.logoCircle}>
            <Feather name="activity" size={22} color={WHITE} />
          </View>
          <Text style={styles.logoText}>DischargeBuddy</Text>
        </View>
        <Text style={styles.headerTitle}>Sign In</Text>
        <Text style={styles.headerSub}>Your recovery, our priority.</Text>
      </LinearGradient>

      {/* ── White Form Card ── */}
      <View style={[styles.card, { paddingBottom: botPad + 16 }]}>
        {isLoggingIn ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingTitle}>{isSuccess ? "Welcome back!" : "Verifying…"}</Text>
            <LiquidCapsuleProgress progress={loginProgress} colorStart={PRIMARY} colorEnd="#EDE9FE" size={200} />
            <Text style={styles.loadingSub}>{isSuccess ? "Redirecting to your dashboard" : "Checking your credentials"}</Text>
          </View>
        ) : (
          <Animated.View style={shakeStyle}>
            {/* Role selector */}
            <View style={styles.roleRow}>
              {(["patient", "family", "caregiver"] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRoleState(r)}
                  style={[styles.roleChip, role === r && styles.roleChipActive]}
                >
                  <Feather name={r === "patient" ? "user" : r === "family" ? "heart" : "users"} size={13} color={role === r ? WHITE : PRIMARY} />
                  <Text style={[styles.roleChipText, { color: role === r ? WHITE : PRIMARY }]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Email */}
            <View style={[styles.inputWrap, emailFocused && styles.inputFocused]}>
              <Feather name="mail" size={18} color={emailFocused ? PRIMARY : MUTED} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={MUTED}
                value={email} onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}
                autoCapitalize="none" keyboardType="email-address"
                returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()}
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <View style={[styles.inputWrap, passwordFocused && styles.inputFocused]}>
              <Feather name="lock" size={18} color={passwordFocused ? PRIMARY : MUTED} />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={MUTED}
                value={password} onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                returnKeyType="done" onSubmitEditing={handleLogin}
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name={showPassword ? "eye" : "eye-off"} size={18} color={MUTED} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Sign In */}
            <TouchableOpacity onPress={handleLogin} activeOpacity={0.85} style={styles.primaryBtn}>
              <LinearGradient colors={[PRIMARY, PRIMARY_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtnGrad}>
                <Text style={styles.primaryBtnText}>SIGN IN</Text>
                <Feather name="arrow-right" size={18} color={WHITE} />
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Guest + Demo row */}
            <View style={styles.altRow}>
              <TouchableOpacity style={styles.altBtn} onPress={handleGuestLogin}>
                <Feather name="user" size={15} color={PRIMARY} />
                <Text style={styles.altBtnText}>Guest</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.altBtn, { borderColor: '#D97706' }]} onPress={() => setShowDemoModal(true)}>
                <Feather name="play-circle" size={15} color="#D97706" />
                <Text style={[styles.altBtnText, { color: '#D97706' }]}>Demo</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>New here? </Text>
              <TouchableOpacity onPress={() => router.replace("/register")}>
                <Text style={styles.footerLink}>Create Account</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => { router.replace("/intro"); setTimeout(() => resetOnboarding(), 100); }}
              style={styles.devBtn}
            >
              <Text style={styles.devText}>[Dev] Reset Onboarding</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* Demo Modal */}
      <Modal visible={showDemoModal} transparent animationType="fade" onRequestClose={() => setShowDemoModal(false)}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.modalOuter}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Try Demo Mode</Text>
              <Text style={styles.modalSub}>Explore the app without signing in</Text>
              {([
                { role: 'patient',   icon: 'user',  color: PRIMARY,    label: 'Patient',      sub: 'Recovery & medication tracking' },
                { role: 'family',    icon: 'heart', color: '#f43f5e',  label: 'Family Member', sub: 'Monitor loved ones' },
                { role: 'caregiver', icon: 'users', color: '#0284c7',  label: 'Caregiver',    sub: 'Manage patient plans' },
              ] as const).map((opt) => (
                <TouchableOpacity key={opt.role} style={styles.demoOpt} onPress={() => runDemo(opt.role)}>
                  <View style={[styles.demoOptIcon, { backgroundColor: opt.color + '18' }]}>
                    <Feather name={opt.icon as any} size={20} color={opt.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.demoOptLabel}>{opt.label}</Text>
                    <Text style={styles.demoOptSub}>{opt.sub}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={MUTED} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDemoModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHITE },

  // ── Header ──
  header: {
    paddingHorizontal: 28,
    paddingBottom: 32,
    overflow: 'hidden',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  logoCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  headerTitle: { fontSize: 36, color: WHITE, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.5 },
  headerSub:   { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_400Regular', marginTop: 4 },

  // ── Card ──
  card: {
    flex: 1,
    backgroundColor: WHITE,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24,
    paddingHorizontal: 28,
    paddingTop: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06, shadowRadius: 16,
    elevation: 12,
  },

  // ── Role selector ──
  roleRow: { flexDirection: 'row', backgroundColor: SOFT_BG, borderRadius: 14, padding: 4, marginBottom: 18 },
  roleChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: 11,
  },
  roleChipActive: {
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  roleChipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  // ── Error ──
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 12,
    padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { flex: 1, color: '#EF4444', fontSize: 13, fontFamily: 'Inter_500Medium' },

  // ── Inputs ──
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 6,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  inputFocused: { borderColor: PRIMARY, backgroundColor: '#F5F3FF' },
  input: { flex: 1, fontSize: 15, color: TEXT_DARK, height: 44 },

  forgotWrap: { alignItems: 'flex-end', marginBottom: 18 },
  forgotText: { color: PRIMARY, fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  // ── Primary Button ──
  primaryBtn: {
    borderRadius: 14,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 7,
    marginBottom: 18,
  },
  primaryBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 16,
  },
  primaryBtnText: { color: WHITE, fontSize: 15, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },

  // ── Divider ──
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { color: MUTED, fontSize: 12, fontFamily: 'Inter_400Regular' },

  // ── Alt buttons ──
  altRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  altBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 13, borderRadius: 14,
    borderWidth: 1.5, borderColor: PRIMARY,
  },
  altBtnText: { color: PRIMARY, fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  // ── Footer ──
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
  footerText: { color: MUTED, fontSize: 14 },
  footerLink: { color: PRIMARY, fontSize: 14, fontFamily: 'Inter_700Bold' },

  devBtn: { alignItems: 'center', marginTop: 6 },
  devText: { color: MUTED, fontSize: 11, textDecorationLine: 'underline' },

  // ── Loading ──
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  loadingTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: PRIMARY },
  loadingSub:   { fontSize: 14, color: MUTED, textAlign: 'center' },

  // ── Modal ──
  modalOuter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.25)' },
  modalCard:  { backgroundColor: WHITE, borderRadius: 24, padding: 24, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_800ExtraBold', color: TEXT_DARK, marginBottom: 4 },
  modalSub:   { fontSize: 13, color: MUTED, fontFamily: 'Inter_400Regular', marginBottom: 20 },
  demoOpt: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  demoOptIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  demoOptLabel: { fontSize: 15, fontFamily: 'Inter_700Bold', color: TEXT_DARK },
  demoOptSub:   { fontSize: 12, color: MUTED, fontFamily: 'Inter_400Regular' },
  modalCancelBtn: { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { color: MUTED, fontSize: 14, fontFamily: 'Inter_500Medium' },
});
