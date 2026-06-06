import { Audio } from 'expo-av';
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { TranslateText as Text } from '@/components/TranslateText';
import { useSharedValue, useAnimatedStyle, withSequence, withRepeat, withTiming } from "react-native-reanimated";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { LiquidCapsuleProgress } from "@/components/LiquidCapsuleProgress";

const PRIMARY      = "#7C3AED";
const PRIMARY_DARK = "#5B21B6";
const WHITE        = "#FFFFFF";
const MUTED        = "#94A3B8";
const SOFT_BG      = "#F5F3FF";
const INPUT_BG     = "#F8FAFC";
const TEXT_DARK    = "#1E1B4B";

// ── Decorative Rx header ──────────────────────────────────────────────────────
function RxDecor() {
  return (
    <View style={decor.wrap} pointerEvents="none">
      <Text style={decor.rx}>℞</Text>
      <View style={decor.capsuleRow}>
        <View style={[decor.capsule, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
        <View style={[decor.capsule, { backgroundColor: 'rgba(255,255,255,0.07)', width: 32 }]} />
      </View>
      <View style={[decor.cross, { top: 24, right: 28 }]}>
        <Feather name="plus" size={28} color="rgba(255,255,255,0.1)" />
      </View>
      <View style={[decor.cross, { bottom: 30, left: 20 }]}>
        <Feather name="plus" size={16} color="rgba(255,255,255,0.08)" />
      </View>
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

// ── Input row helper ──────────────────────────────────────────────────────────
function Field({ icon, placeholder, value, onChangeText, secureTextEntry, keyboardType, returnKeyType, onSubmitEditing, innerRef, rightEl, onFocus, onBlur, focused }: any) {
  return (
    <View style={[styles.inputWrap, focused && styles.inputFocused]}>
      <Feather name={icon} size={18} color={focused ? PRIMARY : MUTED} />
      <TextInput
        ref={innerRef}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={MUTED}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={onFocus}
        onBlur={onBlur}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {rightEl}
    </View>
  );
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { login, isOnboarded } = useApp();

  useEffect(() => { if (isOnboarded === false) router.replace('/onboarding'); }, [isOnboarded]);
  if (isOnboarded === false) return null;

  const [fullName,    setFullName]    = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPwd,     setShowPwd]     = useState(false);
  const [role,        setRoleState]   = useState<"patient" | "caregiver" | "family">("patient");

  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [pwdFocused,   setPwdFocused]   = useState(false);

  // Role-specific
  const [familyMemberName,  setFamilyMemberName]  = useState("");
  const [familyMemberEmail, setFamilyMemberEmail] = useState("");
  const [hospitalName,      setHospitalName]      = useState("");
  const [licenseNumber,     setLicenseNumber]     = useState("");

  const [isRegistering, setIsRegistering] = useState(false);
  const [progress,      setProgress]      = useState(0);
  const [isSuccess,     setIsSuccess]     = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const emailRef    = React.useRef<TextInput>(null);
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

  const handleRegister = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    if (!fullName || !email || !password) { setError("Please fill in all required fields"); shake(); return; }

    setIsRegistering(true);
    setProgress(0.8);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
      const body: any = { email, name: fullName, role, password };
      if (role === 'family' && familyMemberName.trim()) {
        body.familyMember = { name: familyMemberName.trim(), email: familyMemberEmail.trim() || null };
      }
      if (role === 'caregiver') {
        body.professionalDetails = { hospitalName: hospitalName.trim(), licenseNumber: licenseNumber.trim() };
      }
      const res = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Registration failed"); }
      const data = await res.json();
      await login(data.user, data.token);
      setProgress(1); setIsSuccess(true);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      try {
        const { sound } = await Audio.Sound.createAsync(require("../assets/sounds/notification.mp3"));
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((s) => { if (s.isLoaded && s.didJustFinish) sound.unloadAsync(); });
      } catch {}
      setTimeout(() => {
        const dest = role === 'caregiver' ? '/caregiver/dashboard' : role === 'family' ? '/family/dashboard' : '/(tabs)';
        router.replace(dest as any);
      }, 700);
    } catch (err: any) {
      setIsRegistering(false); setProgress(0);
      setError(err.message || "Failed to register"); shake();
    }
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
        style={[styles.header, { paddingTop: topPad + 20 }]}
      >
        <RxDecor />
        <TouchableOpacity onPress={() => router.replace("/login")} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Account</Text>
        <Text style={styles.headerSub}>Join DischargeBuddy — your care, simplified.</Text>
      </LinearGradient>

      {/* ── White Card ── */}
      <ScrollView
        style={styles.scrollWrap}
        contentContainerStyle={[styles.card, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {isRegistering ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingTitle}>{isSuccess ? "Welcome aboard!" : "Setting up your profile…"}</Text>
            <LiquidCapsuleProgress progress={progress} colorStart={PRIMARY} colorEnd="#EDE9FE" size={200} />
            <Text style={styles.loadingSub}>Securing your medical recovery space</Text>
          </View>
        ) : (
          <Animated.View style={shakeStyle}>
            {/* Role selector */}
            <Text style={styles.sectionLabel}>I am a</Text>
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

            {/* Core fields */}
            <Text style={styles.sectionLabel}>Your details</Text>
            <Field icon="user" placeholder="Full Name" value={fullName} onChangeText={setFullName}
              focused={nameFocused} onFocus={() => setNameFocused(true)} onBlur={() => setNameFocused(false)}
              returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />
            <Field icon="mail" placeholder="Email address" value={email} onChangeText={setEmail}
              focused={emailFocused} onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}
              keyboardType="email-address" innerRef={emailRef}
              returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
            <Field icon="lock" placeholder="Password" value={password} onChangeText={setPassword}
              focused={pwdFocused} onFocus={() => setPwdFocused(true)} onBlur={() => setPwdFocused(false)}
              secureTextEntry={!showPwd} innerRef={passwordRef}
              returnKeyType="done" onSubmitEditing={handleRegister}
              rightEl={
                <TouchableOpacity onPress={() => setShowPwd(!showPwd)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Feather name={showPwd ? "eye" : "eye-off"} size={18} color={MUTED} />
                </TouchableOpacity>
              }
            />

            {/* Family extra fields */}
            {role === 'family' && (
              <View style={styles.extraCard}>
                <View style={styles.extraCardHeader}>
                  <Feather name="heart" size={15} color={PRIMARY} />
                  <Text style={styles.extraCardTitle}>Who are you managing?</Text>
                </View>
                <Text style={styles.extraCardSub}>Add a family member's details (optional)</Text>
                <Field icon="user" placeholder="Member's full name" value={familyMemberName} onChangeText={setFamilyMemberName}
                  focused={false} onFocus={() => {}} onBlur={() => {}} />
                <Field icon="mail" placeholder="Their email (optional)" value={familyMemberEmail} onChangeText={setFamilyMemberEmail}
                  keyboardType="email-address" focused={false} onFocus={() => {}} onBlur={() => {}} />
              </View>
            )}

            {/* Caregiver extra fields */}
            {role === 'caregiver' && (
              <View style={styles.extraCard}>
                <View style={styles.extraCardHeader}>
                  <Feather name="briefcase" size={15} color={PRIMARY} />
                  <Text style={styles.extraCardTitle}>Professional Details</Text>
                </View>
                <Text style={styles.extraCardSub}>Required for caregiver verification</Text>
                <Field icon="home" placeholder="Hospital / Clinic name" value={hospitalName} onChangeText={setHospitalName}
                  focused={false} onFocus={() => {}} onBlur={() => {}} />
                <Field icon="award" placeholder="Medical license number" value={licenseNumber} onChangeText={setLicenseNumber}
                  focused={false} onFocus={() => {}} onBlur={() => {}} />
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity onPress={handleRegister} activeOpacity={0.85} style={styles.primaryBtn}>
              <LinearGradient colors={[PRIMARY, PRIMARY_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtnGrad}>
                <Text style={styles.primaryBtnText}>GET STARTED</Text>
                <Feather name="arrow-right" size={18} color={WHITE} />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace("/login")}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHITE },

  // ── Header ──
  header: {
    paddingHorizontal: 28,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  headerTitle: { fontSize: 34, color: WHITE, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.5 },
  headerSub:   { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_400Regular', marginTop: 4 },

  // ── Scroll + Card ──
  scrollWrap: { flex: 1, marginTop: -22 },
  card: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 28,
  },

  // ── Section label ──
  sectionLabel: { fontSize: 12, color: MUTED, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },

  // ── Role selector ──
  roleRow: { flexDirection: 'row', backgroundColor: SOFT_BG, borderRadius: 14, padding: 4, marginBottom: 16 },
  roleChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 11 },
  roleChipActive: { backgroundColor: PRIMARY, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3 },
  roleChipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  // ── Error ──
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { flex: 1, color: '#EF4444', fontSize: 13, fontFamily: 'Inter_500Medium' },

  // ── Inputs ──
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: INPUT_BG, borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 6, borderWidth: 1.5, borderColor: '#E2E8F0', marginBottom: 10 },
  inputFocused: { borderColor: PRIMARY, backgroundColor: '#F5F3FF' },
  input: { flex: 1, fontSize: 15, color: TEXT_DARK, height: 42 },

  // ── Extra cards (family/caregiver) ──
  extraCard: { backgroundColor: SOFT_BG, borderRadius: 16, borderWidth: 1.5, borderColor: PRIMARY + '22', padding: 14, gap: 6, marginBottom: 10 },
  extraCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  extraCardTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: PRIMARY },
  extraCardSub:   { fontSize: 12, color: MUTED, fontFamily: 'Inter_400Regular', marginBottom: 6 },

  // ── Primary Button ──
  primaryBtn: { borderRadius: 14, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 7, marginTop: 6, marginBottom: 18 },
  primaryBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 16 },
  primaryBtnText: { color: WHITE, fontSize: 15, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },

  // ── Footer ──
  footerRow: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: MUTED, fontSize: 14 },
  footerLink: { color: PRIMARY, fontSize: 14, fontFamily: 'Inter_700Bold' },

  // ── Loading ──
  loadingWrap: { paddingVertical: 60, alignItems: 'center', gap: 20 },
  loadingTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: PRIMARY },
  loadingSub:   { fontSize: 14, color: MUTED, textAlign: 'center' },
});
