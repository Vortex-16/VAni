import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Dimensions,
  StatusBar,
  Image,
  Modal,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { Animated as RNAnimated, Easing as RNEasing } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { TranslateText as Text } from '@/components/TranslateText';
import { useApp } from "@/context/AppContext";import { MockProvider } from '@/context/MockProvider';import { LiquidCapsuleProgress } from "@/components/LiquidCapsuleProgress";
import { getApiUrl } from '@/utils/apiUrl';
import { GlareHover } from '@/components/GlareHover';
import { RoleSelectModal, AppRole } from '@/components/RoleSelectModal';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

// Snap positions as fraction of screen height
const COLLAPSED_HEIGHT = height * 0.48;  // 48% - default
const EXPANDED_HEIGHT  = height * 0.65;  // 65% - dragged up

// translateY values: 0 = at EXPANDED position, positive = slide down toward COLLAPSED
const SNAP_EXPANDED  = 0;
const SNAP_COLLAPSED = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;

const isExpoGo = Constants.appOwnership === 'expo';
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '294320272880-n69lce6o1nas43m16bkdk7kipj67sgfr.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

const isGoogleAuthAvailable = (): boolean => {
  if (Platform.OS === 'web') return !!GOOGLE_WEB_CLIENT_ID;
  if (Platform.OS === 'android') return !isExpoGo && !!GOOGLE_ANDROID_CLIENT_ID;
  if (Platform.OS === 'ios') return !isExpoGo && !!GOOGLE_IOS_CLIENT_ID;
  return false;
};

const getGoogleAuthConfig = () => {
  const config: any = { scopes: ['openid', 'profile', 'email'] };
  config.webClientId = GOOGLE_WEB_CLIENT_ID;
  if (Platform.OS === 'android' && GOOGLE_ANDROID_CLIENT_ID) config.androidClientId = GOOGLE_ANDROID_CLIENT_ID;
  if (Platform.OS === 'ios' && GOOGLE_IOS_CLIENT_ID) config.iosClientId = GOOGLE_IOS_CLIENT_ID;
  return config;
};

// ── Colors ────────────────────────────────────────────────────────────────────
const BG_COLOR      = '#E9DEFE';
const PRIMARY_COLOR = '#6C47FF';
const TEXT_DARK     = "#1E293B";
const MUTED         = "#64748B";
const WHITE         = "#FFFFFF";

// ── Google G Icon ─────────────────────────────────────────────────────────────
const GoogleIcon = ({ size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <Path fill="none" d="M0 0h48v48H0z"/>
  </Svg>
);

// ── Floating Cloud ────────────────────────────────────────────────────────────
function ParallaxCloud({ scale, top, left, duration }: { scale: number; top: number; left: number; duration: number }) {
  const floatY = useRef(new RNAnimated.Value(0)).current;
  const floatX = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    RNAnimated.loop(RNAnimated.parallel([
      RNAnimated.sequence([
        RNAnimated.timing(floatY, { toValue: -15, duration, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: true }),
        RNAnimated.timing(floatY, { toValue: 0,   duration, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: true }),
      ]),
      RNAnimated.sequence([
        RNAnimated.timing(floatX, { toValue: 20,  duration: duration * 1.2, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: true }),
        RNAnimated.timing(floatX, { toValue: 0,   duration: duration * 1.2, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: true }),
      ]),
    ])).start();
  }, []);
  return (
    <RNAnimated.View style={{ position: 'absolute', top, left, transform: [{ translateY: floatY }, { translateX: floatX }, { scale }], opacity: 0.7 }}>
      <View style={styles.cloudContainer}>
        <View style={[styles.cloudCircle, styles.cloudCircleLeft]} />
        <View style={[styles.cloudCircle, styles.cloudCircleTop]} />
        <View style={[styles.cloudCircle, styles.cloudCircleRight]} />
        <View style={styles.cloudBase} />
      </View>
    </RNAnimated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, switchProvider, setOnboarded } = useApp();

  const [error,        setError]        = useState<string | null>(null);
  const [isSignUp,     setIsSignUp]     = useState(false);
  const [isLoggingIn,  setIsLoggingIn]  = useState(false);
  const [loginProgress, setLoginProgress] = useState(0);
  const [isSuccess,    setIsSuccess]    = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [pendingToken,  setPendingToken]  = useState<string | null>(null);
  const [pendingEmail,  setPendingEmail]  = useState<string | undefined>(undefined);
  const [suggestedRole, setSuggestedRole] = useState<AppRole>('patient');
  const [isExpanded,   setIsExpanded]   = useState(false);

  // ── Email/password form state ──
  const [emailInput,      setEmailInput]      = useState('');
  const [passwordInput,   setPasswordInput]   = useState('');
  const [nameInput,       setNameInput]       = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  // ── Gesture / Animation ──
  // translateY: SNAP_COLLAPSED = sheet at 42% height, SNAP_EXPANDED = sheet at 80%
  const translateY = useSharedValue(SNAP_COLLAPSED);
  const startY     = useSharedValue(SNAP_COLLAPSED);

  const snapTo = (target: number, expanded: boolean) => {
    'worklet';
    translateY.value = withSpring(target, { damping: 20, stiffness: 180 });
    runOnJS(setIsExpanded)(expanded);
    if (Platform.OS !== 'web') runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => { startY.value = translateY.value; })
    .onUpdate((e) => {
      const next = startY.value + e.translationY;
      // Clamp between expanded and collapsed
      translateY.value = Math.max(SNAP_EXPANDED, Math.min(SNAP_COLLAPSED, next));
    })
    .onEnd((e) => {
      // Snap to nearest based on velocity + position
      const midpoint = (SNAP_EXPANDED + SNAP_COLLAPSED) / 2;
      if (e.velocityY < -500 || translateY.value < midpoint) {
        snapTo(SNAP_EXPANDED, true);
      } else {
        snapTo(SNAP_COLLAPSED, false);
      }
    });

  // Animated sheet style
  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Blur intensity: 0 when collapsed, 20 when fully expanded
  const blurAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [SNAP_COLLAPSED, SNAP_EXPANDED], [0, 1], Extrapolation.CLAMP),
    pointerEvents: translateY.value < SNAP_COLLAPSED - 10 ? 'auto' : 'none',
  }));

  // Handle bar color hint
  const handleAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [SNAP_EXPANDED, SNAP_COLLAPSED], [0.3, 1], Extrapolation.CLAMP),
  }));

  // ── Auth ──
  const canUseGoogleAuth = React.useMemo(() => isGoogleAuthAvailable(), []);
  const [, googleResponse, promptGoogleAsync] = canUseGoogleAuth
    ? Google.useAuthRequest(getGoogleAuthConfig()) : [null, null, null];

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const accessToken = googleResponse.authentication?.accessToken;
      if (accessToken) executeGoogleOAuth(accessToken);
    } else if (googleResponse?.type === 'error') {
      setError('Google sign-in was cancelled or failed.');
    }
  }, [googleResponse]);

  const handleTransitionToSuccess = (navRole: AppRole) => {
    setIsSuccess(true);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      const path = navRole === 'caregiver' ? '/caregiver/dashboard' : navRole === 'family' ? '/family/dashboard' : '/(tabs)';
      router.replace(path as any);
    }, 600);
  };

  const postOAuth = async (accessToken: string, opts?: { role?: AppRole; confirmRole?: boolean; extraData?: any }) => {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/auth/oauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google', accessToken,
        ...(opts?.role ? { role: opts.role } : {}),
        ...(opts?.confirmRole ? { confirmRole: true } : {}),
        ...(opts?.extraData ? opts.extraData : {}),
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'Google sign-in failed');
    return d;
  };

  const executeGoogleOAuth = async (accessToken: string) => {
    setIsLoggingIn(true); setLoginProgress(0.7); setError(null);
    try {
      const data = await postOAuth(accessToken);
      if (data.needsRoleSelection) {
        setPendingToken(accessToken);
        setPendingEmail(data.pendingProfile?.email);
        setSuggestedRole((data.suggestedRole as AppRole) ?? 'patient');
        setIsLoggingIn(false); setLoginProgress(0);
        setShowRoleModal(true);
        return;
      }
      await login(data.user, data.token, 'google');
      setLoginProgress(1);
      setTimeout(() => handleTransitionToSuccess(data.user?.role), 100);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setIsLoggingIn(false); setLoginProgress(0);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleRoleConfirm = async (chosenRole: AppRole, extraData?: any) => {
    setShowRoleModal(false);
    if (!pendingToken) return;
    setIsLoggingIn(true); setLoginProgress(0.8); setError(null);
    try {
      const data = await postOAuth(pendingToken, { role: chosenRole, confirmRole: true, extraData });
      await login(data.user, data.token, 'google');
      setLoginProgress(1);
      setTimeout(() => handleTransitionToSuccess(data.user?.role), 100);
    } catch (err: any) {
      setError(err.message || 'Role confirmation failed');
      setIsLoggingIn(false); setLoginProgress(0);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleDevLogin = async () => {
    setIsLoggingIn(true); setLoginProgress(0.5); setError(null);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dev@example.com', password: 'devpassword123' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Dev login failed');
      
      await login(data.user, data.token);
      setLoginProgress(1);
      setTimeout(() => handleTransitionToSuccess(data.user?.role), 100);
    } catch (err: any) {
      setError(err.message || 'Dev login failed');
      setIsLoggingIn(false); setLoginProgress(0);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };


  const handleGoogleAction = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    if (!canUseGoogleAuth) { setError('Google Sign-In needs native credentials on this device.'); return; }
    if (promptGoogleAsync) promptGoogleAsync();
  };

  // ── Email / Password Auth ──────────────────────────────────────────────────
  const handleEmailAuth = async () => {
    if (!emailInput.trim()) { setError('Please enter your email address'); return; }
    if (!passwordInput) { setError('Please enter your password'); return; }
    if (isSignUp && !nameInput.trim()) { setError('Please enter your full name'); return; }

    setIsLoggingIn(true); setLoginProgress(0.3); setError(null);
    try {
      const apiUrl = getApiUrl();
      if (isSignUp) {
        // Registration flow
        const res = await fetch(`${apiUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.trim().toLowerCase(), password: passwordInput, name: nameInput.trim(), role: 'patient' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        setIsLoggingIn(false); setLoginProgress(0);
        // Redirect to verify-email screen
        router.push(`/verify-email?email=${encodeURIComponent(emailInput.trim().toLowerCase())}` as any);
      } else {
        // Login flow
        setLoginProgress(0.6);
        const res = await fetch(`${apiUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.trim().toLowerCase(), password: passwordInput }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.error === 'USE_GOOGLE_SIGNIN') {
            throw new Error('This account uses Google Sign-In. Please tap "Continue with Google" instead.');
          }
          if (data.error === 'EMAIL_NOT_VERIFIED') {
            setIsLoggingIn(false); setLoginProgress(0);
            router.push(`/verify-email?email=${encodeURIComponent(data.email || emailInput.trim())}` as any);
            return;
          }
          throw new Error(data.error || 'Login failed');
        }
        await login(data.user, data.token);
        setLoginProgress(1);
        setTimeout(() => handleTransitionToSuccess(data.user?.role), 100);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setIsLoggingIn(false); setLoginProgress(0);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const runDemo = async (role: AppRole) => {
    setIsLoggingIn(true); setShowDemoModal(false);
    setTimeout(async () => {
      const mockUser = { id: `demo-${role}-1`, name: `Demo ${role}`, email: `demo@${role}.com`, role, isEmailVerified: true };
      await login(mockUser as any, 'demo_token_123');
      setOnboarded(true);
      switchProvider(new MockProvider());
      setIsLoggingIn(false);
      handleTransitionToSuccess(role);
    }, 1500);
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* ── Background ── */}
      <View style={[styles.bgLayer, { paddingTop: insets.top }]}>
        <ParallaxCloud scale={0.8} top={height * 0.08} left={-20} duration={4000} />
        <ParallaxCloud scale={1.2} top={height * 0.22} left={width * 0.68} duration={4500} />
        <ParallaxCloud scale={0.6} top={height * 0.35} left={width * 0.1} duration={3500} />
        <View style={styles.mascotWrap}>
          <Image source={require('@/assets/images/intro_image.png')} style={styles.robotImage} />
        </View>
      </View>

      {/* ── Blur overlay — visible only when expanded ── */}
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.blurOverlay, blurAnimStyle]} pointerEvents="none">
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
      </Animated.View>

      {/* ── Draggable Bottom Sheet ── */}
        <Animated.View style={[styles.sheet, sheetAnimStyle]}>
          {/* Handle bar — drag to resize, tap to toggle. The pan gesture lives
              on the handle only so the content below can scroll freely. */}
          <GestureDetector gesture={panGesture}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {
                if (isExpanded) {
                  translateY.value = withSpring(SNAP_COLLAPSED, { damping: 20, stiffness: 180 });
                  setIsExpanded(false);
                } else {
                  translateY.value = withSpring(SNAP_EXPANDED, { damping: 20, stiffness: 180 });
                  setIsExpanded(true);
                }
              }}
              style={styles.handleWrap}
            >
              <Animated.View style={[styles.handleBar, handleAnimStyle]} />
            </TouchableOpacity>
          </GestureDetector>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom + 48, 64) }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets
          >
            <View style={styles.textContent}>
              <Text style={styles.title}>{isSignUp ? 'Create Account' : 'Sign in'}</Text>
              <Text style={styles.subtitle}>
                {isSignUp
                  ? 'Create your account with email or Google.'
                  : 'Sign in with your email & password, or continue with Google.'}
              </Text>
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {isLoggingIn ? (
              <Animated.View entering={FadeIn} style={styles.loadingWrap}>
                <Text style={styles.loadingTitle}>{isSuccess ? 'Success!' : 'Authenticating…'}</Text>
                <LiquidCapsuleProgress progress={loginProgress} colorStart={PRIMARY_COLOR} colorEnd="#EDE9FE" size={180} />
              </Animated.View>
            ) : (
              <View style={styles.actionContainer}>

                {/* ── Email / Name fields ── */}
                {isSignUp && (
                  <>
                    <View style={styles.inputWrap}>
                      <Feather name="user" size={16} color={MUTED} style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Full Name"
                        placeholderTextColor={MUTED}
                        value={nameInput}
                        onChangeText={setNameInput}
                        autoCapitalize="words"
                      />
                    </View>
                  </>
                )}

                <View style={styles.inputWrap}>
                  <Feather name="mail" size={16} color={MUTED} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Email Address"
                    placeholderTextColor={MUTED}
                    value={emailInput}
                    onChangeText={setEmailInput}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Feather name="lock" size={16} color={MUTED} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="Password"
                    placeholderTextColor={MUTED}
                    value={passwordInput}
                    onChangeText={setPasswordInput}
                    secureTextEntry={!showPasswordInput}
                  />
                  <TouchableOpacity onPress={() => setShowPasswordInput(!showPasswordInput)} style={{ padding: 4 }}>
                    <Feather name={showPasswordInput ? "eye-off" : "eye"} size={16} color={MUTED} />
                  </TouchableOpacity>
                </View>

                {/* Forgot password — only on sign-in */}
                {!isSignUp && (
                  <TouchableOpacity onPress={() => router.push('/forgot-password' as any)} style={styles.forgotRow}>
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>
                )}

                {/* Primary email/password button */}
                <TouchableOpacity
                  onPress={handleEmailAuth}
                  activeOpacity={0.85}
                  style={styles.emailBtn}
                >
                  <Text style={styles.emailBtnText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Google */}
                <GlareHover
                  width="100%"
                  glareColor="#ffffff"
                  glareOpacity={0.5}
                  glareAngle={45}
                  glareSize={200}
                  transitionDuration={500}
                  borderRadius={16}
                >
                  <TouchableOpacity onPress={handleGoogleAction} activeOpacity={0.85} style={styles.googleBtn}>
                    <GoogleIcon size={22} />
                    <Text style={styles.googleBtnText} numberOfLines={1}>Continue with Google</Text>
                  </TouchableOpacity>
                </GlareHover>

                {/* Sign up / Sign in toggle */}
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleText}>
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                  </Text>
                  <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); setError(null); }} activeOpacity={0.7}>
                    <Text style={styles.toggleLink}>{isSignUp ? 'Sign in' : 'Sign up'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Dev links */}
                <View style={styles.devOptions}>
                  <TouchableOpacity onPress={() => setShowDemoModal(true)} style={styles.devBtn}>
                    <Text style={styles.devText}>Demo / Guest View</Text>
                  </TouchableOpacity>
                  <Text style={{ color: '#CBD5E1' }}>•</Text>
                  <TouchableOpacity onPress={handleDevLogin} style={styles.devBtn}>
                    <Text style={[styles.devText, { color: PRIMARY_COLOR, fontFamily: 'Inter_700Bold' }]}>Dev Login</Text>
                  </TouchableOpacity>
                  <Text style={{ color: '#CBD5E1' }}>•</Text>
                  <TouchableOpacity onPress={() => router.replace('/intro')} style={styles.devBtn}>
                    <Text style={styles.devText}>Back to Intro</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>

      {/* ── Demo Role Modal ── */}
      <Modal visible={showDemoModal} transparent animationType="fade" onRequestClose={() => setShowDemoModal(false)}>
        <BlurView intensity={20} tint="dark" style={styles.modalOuter}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Demo Role</Text>
            <Text style={styles.modalSub}>Experience the app as different users without an account.</Text>
            <View style={{ gap: 10 }}>
              {([
                { role: 'patient',   icon: 'user',     color: PRIMARY_COLOR, label: 'Patient',   sub: 'View patient dashboard' },
                { role: 'family',    icon: 'heart',    color: '#db2777',     label: 'Family',    sub: 'Monitor a patient' },
                { role: 'caregiver', icon: 'users',    color: '#0284c7',     label: 'Caregiver', sub: 'Manage patient plans' },
                { role: 'doctor',    icon: 'activity', color: '#10b981',     label: 'Doctor',    sub: 'Create discharge plans' },
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

      <RoleSelectModal
        visible={showRoleModal}
        email={pendingEmail}
        suggestedRole={suggestedRole}
        onConfirm={handleRoleConfirm as any}
        onCancel={() => { setShowRoleModal(false); setPendingToken(null); }}
      />
    </GestureHandlerRootView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_COLOR },

  // Background + mascot
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  mascotWrap: {
    position: 'absolute',
    bottom: COLLAPSED_HEIGHT - 40,  // peeks above the collapsed sheet
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 30,
  },
  robotImage: {
    width: width * 1.3,
    height: height * 0.55,
    resizeMode: 'contain',
  },

  // Blur overlay
  blurOverlay: { zIndex: 5 },

  // ── Draggable sheet ──
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: EXPANDED_HEIGHT,      // always full expanded height; translateY moves it
    backgroundColor: WHITE,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 30,
    zIndex: 10,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },

  sheetScroll: {
    flex: 1,
    width: '100%',
  },
  sheetContent: {
    paddingHorizontal: 32,
    alignItems: 'center',
    flexGrow: 1,
  },

  // Text
  textContent: { alignItems: 'center', marginBottom: 28, width: '100%' },
  title: {
    fontSize: 28, color: TEXT_DARK, fontFamily: 'Inter_800ExtraBold',
    textAlign: 'center', marginBottom: 8, letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14, color: MUTED, fontFamily: 'Inter_500Medium', textAlign: 'center',
  },

  // Action buttons
  actionContainer: { width: '100%', alignItems: 'center' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F8FAFC', paddingVertical: 18, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#E2E8F0', width: '100%', gap: 12,
  },
  googleBtnText: { color: TEXT_DARK, fontSize: 16, fontFamily: 'Inter_600SemiBold', flexShrink: 1 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  toggleText: { color: MUTED, fontSize: 14, fontFamily: 'Inter_500Medium' },
  toggleLink: { color: PRIMARY_COLOR, fontSize: 14, fontFamily: 'Inter_700Bold' },

  // Email/password input
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14,
    backgroundColor: '#F8FAFC', paddingHorizontal: 14, marginBottom: 10, height: 48, width: '100%',
  },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: TEXT_DARK },
  emailBtn: {
    width: '100%', height: 50, borderRadius: 25, backgroundColor: PRIMARY_COLOR,
    alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 4,
  },
  emailBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15, letterSpacing: 0.4 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 12, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { color: MUTED, fontFamily: 'Inter_500Medium', fontSize: 12 },
  forgotRow: { alignSelf: 'flex-end', marginBottom: 6, marginTop: -2 },
  forgotText: { color: PRIMARY_COLOR, fontFamily: 'Inter_600SemiBold', fontSize: 13 },

  devOptions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22 },
  devBtn: { padding: 4 },
  devText: { color: MUTED, fontSize: 13, fontFamily: 'Inter_500Medium', textDecorationLine: 'underline' },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 20, width: '100%',
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { flex: 1, color: '#EF4444', fontSize: 13, fontFamily: 'Inter_500Medium' },

  // Loading
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  loadingTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: PRIMARY_COLOR, marginBottom: 20 },

  // Clouds
  cloudContainer: { width: 100, height: 60, justifyContent: 'flex-end' },
  cloudCircle: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 50 },
  cloudCircleLeft:  { width: 40, height: 40, bottom: 0, left: 10 },
  cloudCircleTop:   { width: 50, height: 50, bottom: 10, left: 25 },
  cloudCircleRight: { width: 40, height: 40, bottom: 0, right: 15 },
  cloudBase: { width: 80, height: 30, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, bottom: 0, left: 10, position: 'absolute' },

  // Demo modal
  modalOuter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.1)' },
  modalCard:  {
    backgroundColor: WHITE, borderRadius: 24, padding: 24, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12,
  },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_800ExtraBold', color: TEXT_DARK, marginBottom: 4 },
  modalSub:   { fontSize: 13, color: MUTED, fontFamily: 'Inter_400Regular', marginBottom: 20 },
  demoOpt:    { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  demoOptIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  demoOptLabel: { fontSize: 15, fontFamily: 'Inter_700Bold', color: TEXT_DARK },
  demoOptSub:   { fontSize: 12, color: MUTED, fontFamily: 'Inter_400Regular' },
  modalCancelBtn:  { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { color: MUTED, fontSize: 14, fontFamily: 'Inter_500Medium' },
});
