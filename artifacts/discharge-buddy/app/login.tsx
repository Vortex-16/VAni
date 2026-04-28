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
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
  withDelay,
  withSpring,
  interpolate,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { MockProvider } from "@/context/MockProvider";
import { ErrorNotice } from "@/components/ErrorNotice";
import { LiquidCapsuleProgress } from "@/components/LiquidCapsuleProgress";
import { MascotBuddy } from "@/components/MascotBuddy";
import { getFriendlyErrorMessage } from '@/utils/errorUtils';

const PRIMARY = "#6C47FF";
const PRIMARY_LIGHT = "#4B26C8";
const PRIMARY_SOFT = "#EDE9FE";
const WHITE = "#ffffff";
const MUTED = "#94a3b8";
const DESTRUCTIVE = "#ef4444";
const INPUT_BG = "#ffffff";
const INPUT_BORDER = "#E2E8F0";
const BACKGROUND = "#F5F4FB";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, setRole, setUser, switchProvider, isOnboarded } = useApp();

  useEffect(() => {
    if (isOnboarded === false) {
      router.replace('/onboarding');
    }
  }, [isOnboarded]);

  if (isOnboarded === false) return null;

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRoleState] = useState<"patient" | "caregiver" | "family">("patient");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation State
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginProgress, setLoginProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordRef = React.useRef<TextInput>(null);
  const fullNameRef = React.useRef<TextInput>(null);

  // Stagger values
  const welcomeY = useSharedValue(20);
  const welcomeAlpha = useSharedValue(0);
  const inputAlpha = useSharedValue(0);
  const inputY = useSharedValue(15);
  const btnAlpha = useSharedValue(0);
  const btnScale = useSharedValue(0.95);

  // Reanimated values
  const sheetY = useSharedValue(SCREEN_HEIGHT);
  const shakeOffset = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    // 1. Slide up bottom sheet with a bouncy spring
    sheetY.value = withSpring(0, {
      damping: 14,
      stiffness: 70,
    });

    // 2. Staggered entry for content
    welcomeAlpha.value = withDelay(400, withTiming(1, { duration: 600 }));
    welcomeY.value = withDelay(400, withSpring(0));

    inputAlpha.value = withDelay(600, withTiming(1, { duration: 600 }));
    inputY.value = withDelay(600, withSpring(0));

    btnAlpha.value = withDelay(800, withTiming(1, { duration: 600 }));
    btnScale.value = withDelay(800, withSpring(1));
  }, []);

  const shake = () => {
    shakeOffset.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withRepeat(withTiming(10, { duration: 50 }), 5, true),
      withTiming(0, { duration: 50 })
    );
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const animatedFormStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
    display: opacity.value === 0 ? "none" : "flex",
  }));

  const animatedWelcome = useAnimatedStyle(() => ({
    opacity: welcomeAlpha.value,
    transform: [{ translateY: welcomeY.value }],
  }));

  const animatedInputs = useAnimatedStyle(() => ({
    opacity: inputAlpha.value,
    transform: [{ translateY: inputY.value }],
  }));

  const animatedButtons = useAnimatedStyle(() => ({
    opacity: btnAlpha.value,
    transform: [{ scale: btnScale.value }],
  }));

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 24 : insets.bottom;

  const cleanErrorMessage = (msg: string) => {
    return msg.replace(/^Error:\s*/i, "");
  };

  const startLoginAnimation = () => {
    opacity.value = withTiming(0, { duration: 200 });
    scale.value = withTiming(0.9, { duration: 200 });
    setIsLoggingIn(true);
    setLoginProgress(0.8); // Optimistically fill 80% while waiting for network
  };

  const handleTransitionToSuccess = async () => {
    setIsSuccess(true);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Play custom success sound with thread safety
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/sounds/universfield-new-notification-057-494255.mp3.mpeg")
      );
      await sound.playAsync();
      // Unload sound after playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (error) {
      console.log("Error playing success sound:", error);
    }

    // Get role from AppContext state (which was updated by login/setUser)
    setTimeout(() => {
      sheetY.value = withTiming(SCREEN_HEIGHT, {
        duration: 400,
        easing: Easing.in(Easing.exp),
      }, (finished) => {
        if (finished) {
          const targetPath = role === "caregiver"
            ? "/caregiver/dashboard"
            : role === "family"
            ? "/family/dashboard"
            : "/(tabs)";
          runOnJS(router.replace)(targetPath);
        }
      });
    }, 200);
  };

  const handleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    if (!email || !password) {
      setError("Please enter both email and password");
      shake();
      return;
    }

    // Start visual transition
    startLoginAnimation();

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }

      const data = await res.json();
      await login(data.user, data.token);
      
      // Success! Immediately fill to 100% and transition
      setLoginProgress(1);
      setTimeout(() => {
        handleTransitionToSuccess();
      }, 100);
    } catch (err: any) {
      console.log("[Auth] Login failure:", err.message);
      setError(getFriendlyErrorMessage(err, 'auth'));

      // Reset UI on error
      setIsLoggingIn(false);
      setLoginProgress(0);
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withTiming(1, { duration: 200 });
      shake();
    }
  };

  const handleGuestLogin = async () => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.removeItem("discharge_buddy_token");

    startLoginAnimation();

    setTimeout(async () => {
      // Stay on ApiProvider for guest too, so AI chat works
      setRole(role);
      setUser({
        id: Date.now().toString(),
        name: "Guest " + role,
        email: "test@example.com",
        role,
      });
      setLoginProgress(1);
      setTimeout(() => {
        handleTransitionToSuccess();
      }, 100);
    }, 300); // Tiny simulated network delay for guests
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BACKGROUND }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={[{ flex: 1 }]}>
          {/* ── Header Area ── */}
          <LinearGradient
            colors={[PRIMARY_LIGHT, PRIMARY]}
            style={[styles.header, { paddingTop: topInset + 40 }]}
          >
            <View style={styles.mascotContainer}>
              <MascotBuddy 
                size={80} 
                message="Welcome back! I'm Mr. Meddy. Your health and trust mean everything to us. 💜"
              />
            </View>
            <Text style={styles.appName}>DischargeBuddy</Text>
            <Text style={styles.appTagline}>Your recovery, our priority.</Text>
          </LinearGradient>

          {/* ── Animated Bottom Sheet ── */}
          <Animated.View style={[styles.sheet, animatedSheetStyle, { paddingBottom: bottomInset + 20, zIndex: 10 }]}>

            {/* Login Progress Animation View */}
            {isLoggingIn && (
              <View style={styles.animationContainer}>
                <Text style={styles.loadingTitle}>
                  {isSuccess ? "Welcome Back!" : "Authenticating..."}
                </Text>
                <LiquidCapsuleProgress
                  progress={loginProgress}
                  colorStart={PRIMARY}
                  colorEnd={PRIMARY_SOFT}
                  size={240}
                />
                {isSuccess && (
                  <Animated.View style={styles.successCheck}>
                    <Feather name="check" size={40} color={WHITE} />
                  </Animated.View>
                )}
                <Text style={styles.loadingSub}>
                  {isSuccess ? "Redirecting to your dashboard" : "Verifying your medical credentials"}
                </Text>
              </View>
            )}

            {/* Form View */}
            {!isLoggingIn && (
              <Animated.View style={[styles.form, animatedFormStyle, shakeStyle]}>
                <Animated.View style={animatedWelcome}>
                  <Text style={styles.welcomeText}>Login</Text>
                </Animated.View>

                <ErrorNotice
                  message={error || ""}
                  visible={!!error}
                  onDismiss={() => setError(null)}
                />

                <View style={styles.form}>
                  <View style={styles.roleToggle}>
                    {(["patient", "family", "caregiver"] as const).map((r) => (
                      <TouchableOpacity
                        key={r}
                        onPress={() => setRoleState(r)}
                        style={[styles.roleChip, role === r && styles.roleChipActive]}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Feather
                          name={r === "patient" ? "user" : r === "family" ? "heart" : "users"}
                          size={14}
                          color={role === r ? WHITE : PRIMARY}
                        />
                        <Text style={[styles.roleChipText, { color: role === r ? WHITE : PRIMARY }]}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={[styles.inputContainer, emailFocused && styles.inputFocused]}>
                    <Feather name="mail" size={20} color={emailFocused ? PRIMARY : MUTED} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email Address"
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                      submitBehavior="submit"
                      autoCorrect={false}
                      spellCheck={false}
                    />
                  </View>

                  <View style={[styles.inputContainer, passwordFocused && styles.inputFocused]}>
                    <Feather name="lock" size={20} color={passwordFocused ? PRIMARY : MUTED} />
                    <TextInput
                      ref={passwordRef}
                      style={styles.input}
                      placeholder="Password"
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                      autoCorrect={false}
                      spellCheck={false}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={MUTED} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.forgotPass}>
                    <Text style={styles.forgotPassText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                <Animated.View style={[styles.form, animatedButtons]}>
                    <TouchableOpacity
                      style={styles.loginBtn}
                      onPress={handleLogin}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                    <LinearGradient
                      colors={[PRIMARY, PRIMARY_LIGHT]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.loginBtnGradient}
                    >
                      <Text style={styles.loginBtnText}>SIGN IN</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.guestBtn}
                    onPress={handleGuestLogin}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.guestBtnText}>CONTINUE AS GUEST</Text>
                  </TouchableOpacity>

                  <View style={styles.footer}>
                    <Text style={styles.footerText}>New here? </Text>
                    <TouchableOpacity onPress={() => router.replace("/register")}>
                      <Text style={styles.footerLink}>Create Account</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </Animated.View>
            )}
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    height: SCREEN_HEIGHT * 0.45,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  mascotContainer: {
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    color: WHITE,
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginTop: 5,
  },
  sheet: {
    flex: 1,
    backgroundColor: BACKGROUND,
    marginTop: -30,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 30,
    paddingTop: 35,
    zIndex: 10,
  },
  form: {
    gap: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    color: PRIMARY,
    marginBottom: 5,
  },
  roleToggle: {
    flexDirection: "row",
    backgroundColor: WHITE,
    borderRadius: 15,
    padding: 5,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    width: "100%",
  },
  roleChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  roleChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  roleChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: INPUT_BORDER,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === "ios" ? 15 : 5,
    gap: 12,
  },
  inputFocused: {
    borderColor: PRIMARY,
    backgroundColor: "#F8F7FF",
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#000000",
    marginLeft: 10,
  },
  forgotPass: {
    alignItems: "flex-end",
  },
  forgotPassText: {
    color: PRIMARY_LIGHT,
    fontWeight: "600",
    fontSize: 14,
  },
  loginBtn: {
    marginTop: 10,
  },
  loginBtnGradient: {
    borderRadius: 15,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  loginBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  guestBtn: {
    paddingVertical: 15,
    alignItems: "center",
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },
  guestBtnText: {
    color: PRIMARY,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  footerText: {
    color: MUTED,
    fontSize: 14,
  },
  footerLink: {
    color: PRIMARY,
    fontWeight: "700",
    fontSize: 14,
  },
  animationContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 20,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: PRIMARY,
    marginBottom: 10,
  },
  loadingSub: {
    fontSize: 14,
    color: MUTED,
    textAlign: "center",
    maxWidth: "80%",
  },
  successCheck: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    top: "50%",
    marginTop: -20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
});
