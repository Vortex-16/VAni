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
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { LiquidCapsuleProgress } from "@/components/LiquidCapsuleProgress";
import { MascotBuddy } from "@/components/MascotBuddy";

const PRIMARY = "#6C47FF";
const PRIMARY_LIGHT = "#4B26C8";
const PRIMARY_SOFT = "#EDE9FE";
const WHITE = "#ffffff";
const MUTED = "#94a3b8";
const BACKGROUND = "#F5F4FB";
const INPUT_BORDER = "#E2E8F0";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { login, isOnboarded } = useApp();
  
  useEffect(() => {
    if (isOnboarded === false) {
      router.replace('/onboarding');
    }
  }, [isOnboarded]);
  
  if (isOnboarded === false) return null;
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRoleState] = useState<"patient" | "caregiver" | "family">("patient");
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  // Family-specific fields
  const [familyMemberName, setFamilyMemberName] = useState("");
  const [familyMemberEmail, setFamilyMemberEmail] = useState("");

  const [fullNameFocused, setFullNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const emailRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);

  // Stagger values
  const welcomeY = useSharedValue(20);
  const welcomeAlpha = useSharedValue(0);
  const inputAlpha = useSharedValue(0);
  const inputY = useSharedValue(15);
  const btnAlpha = useSharedValue(0);
  const btnScale = useSharedValue(0.95);

  const sheetY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(1);

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

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const animatedFormStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
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

  const handleRegister = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!fullName || !email || !password) {
      alert("Please fill in all fields");
      return;
    }

    opacity.value = withTiming(0, { duration: 200 });
    setIsRegistering(true);

    // Progress simulation
    setProgress(0.8); // Optimistically fill 80% while waiting for network

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
      const body: any = { email, name: fullName, role, password };

      // For family role, include first member data
      if (role === 'family' && familyMemberName.trim()) {
        body.familyMember = {
          name: familyMemberName.trim(),
          email: familyMemberEmail.trim() || null,
        };
      }

      const res = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Registration failed");
      }

      const data = await res.json();
      await login(data.user, data.token);

      // Success! Immediately fill to 100% and transition
      setProgress(1);
      
      setIsSuccess(true);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Play custom success sound
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../assets/sounds/universfield-new-notification-057-494255.mp3.mpeg")
        );
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
          }
        });
      } catch (error) {
        console.log("Error playing success sound:", error);
      }
      
      setTimeout(() => {
        const destination = 
          role === 'caregiver' ? '/caregiver/dashboard' : 
          role === 'family' ? '/family/dashboard' : 
          '/(tabs)';
          
        sheetY.value = withTiming(SCREEN_HEIGHT, {
          duration: 600,
          easing: Easing.in(Easing.exp),
        }, (finished) => {
          if (finished) runOnJS(router.replace)(destination as any);
        });
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setIsRegistering(false);
      setProgress(0);
      opacity.value = withTiming(1, { duration: 200 });
      alert(err.message || "Failed to register");
    }
  };

  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 24 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BACKGROUND }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={{ flex: 1 }}>
          <LinearGradient
            colors={[PRIMARY_LIGHT, PRIMARY]}
            style={[styles.header, { paddingTop: topInset + 40 }]}
          >
            <TouchableOpacity 
              onPress={() => router.replace("/login")}
              style={styles.backBtn}
            >
              <Feather name="arrow-left" size={24} color={WHITE} />
            </TouchableOpacity>
            
            <View style={styles.mascotContainer}>
              <MascotBuddy 
                size={70} 
                message="Welcome! I'm Mr. Meddy, and I'm honored to be part of your recovery. You're special to us! 🐾"
              />
            </View>
            
            <Text style={styles.headerTitle}>Create Account</Text>
            <Text style={styles.headerSubtitle}>Join the DischargeBuddy community</Text>
          </LinearGradient>

          <Animated.View style={[styles.sheet, animatedSheetStyle, { paddingBottom: bottomInset + 20, zIndex: 10 }]}>
            
            {isRegistering && (
              <View style={styles.animationContainer}>
                <Text style={styles.loadingTitle}>
                  {isSuccess ? "Welcome to the family!" : "Creating your profile..."}
                </Text>
                <LiquidCapsuleProgress 
                  progress={progress} 
                  colorStart={PRIMARY} 
                  colorEnd={PRIMARY_SOFT} 
                  size={240}
                />
                <Text style={styles.loadingSub}>
                  Setting up your secure medical recovery space
                </Text>
              </View>
            )}

            {!isRegistering && (
              <Animated.View style={[styles.form, animatedFormStyle]}>
                <Animated.View style={animatedWelcome}>
                  <View style={styles.roleToggle}>
                    {(["patient", "family", "caregiver"] as const).map((r) => (
                      <TouchableOpacity
                        key={r}
                        onPress={() => setRoleState(r)}
                        style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Feather name={r === "patient" ? "user" : r === "family" ? "heart" : "users"} size={14} color={role === r ? WHITE : PRIMARY} />
                        <Text style={[styles.roleBtnText, { color: role === r ? WHITE : PRIMARY }]}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Animated.View>

                <Animated.View style={[styles.form, animatedInputs]}>
                  <View style={[styles.inputContainer, fullNameFocused && styles.inputFocused]}>
                    <Feather name="user" size={20} color={MUTED} />
                    <TextInput
                      style={styles.input}
                      placeholder="Full Name"
                      value={fullName}
                      onChangeText={setFullName}
                      onFocus={() => setFullNameFocused(true)}
                      onBlur={() => setFullNameFocused(false)}
                      returnKeyType="next"
                      onSubmitEditing={() => emailRef.current?.focus()}
                      submitBehavior="submit"
                      autoCorrect={false}
                      spellCheck={false}
                    />
                  </View>

                  <View style={[styles.inputContainer, emailFocused && styles.inputFocused]}>
                    <Feather name="mail" size={20} color={MUTED} />
                    <TextInput
                      ref={emailRef}
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
                    <Feather name="lock" size={20} color={MUTED} />
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
                      onSubmitEditing={handleRegister}
                      autoCorrect={false}
                      spellCheck={false}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={MUTED} />
                    </TouchableOpacity>
                  </View>
                </Animated.View>

                {/* Extra step for Family role */}
                {role === 'family' && (
                  <Animated.View style={animatedInputs}>
                    <View style={styles.familyCard}>
                      <View style={styles.familyCardHeader}>
                        <Feather name="heart" size={16} color={PRIMARY} />
                        <Text style={styles.familyCardTitle}>Who are you managing?</Text>
                      </View>
                      <Text style={styles.familyCardSub}>
                        Add a family member so your dashboard is ready on first launch.
                      </Text>
                      <View style={[styles.inputContainer, { marginTop: 10 }]}>
                        <Feather name="user" size={18} color={MUTED} />
                        <TextInput
                          style={styles.input}
                          placeholder="Member's Full Name *"
                          value={familyMemberName}
                          onChangeText={setFamilyMemberName}
                          autoCorrect={false}
                          spellCheck={false}
                        />
                      </View>
                      <View style={[styles.inputContainer, { marginTop: 10 }]}>
                        <Feather name="mail" size={18} color={MUTED} />
                        <TextInput
                          style={styles.input}
                          placeholder="Their Email (optional, links their app)"
                          value={familyMemberEmail}
                          onChangeText={setFamilyMemberEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          spellCheck={false}
                        />
                      </View>
                    </View>
                  </Animated.View>
                )}

                <Animated.View style={[styles.form, animatedButtons]}>
                  <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <LinearGradient
                      colors={[PRIMARY, PRIMARY_LIGHT]}
                      style={styles.gradientBtn}
                    >
                      <Text style={styles.registerBtnText}>GET STARTED</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => router.replace("/login")}>
                      <Text style={styles.footerLink}>Login</Text>
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
  header: {
    minHeight: SCREEN_HEIGHT * 0.42,
    paddingHorizontal: 30,
    justifyContent: "center",
    paddingBottom: 50,
  },
  mascotContainer: {
    marginBottom: 10,
    alignItems: "flex-start",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: WHITE,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    marginTop: 5,
  },
  sheet: {
    flex: 1,
    backgroundColor: BACKGROUND,
    marginTop: -30,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 30,
    paddingTop: 35,
  },
  form: { gap: 18 },
  roleToggle: {
    flexDirection: "row",
    backgroundColor: WHITE,
    borderRadius: 15,
    padding: 5,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    width: "100%",
  },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  roleBtnActive: { backgroundColor: PRIMARY },
  roleBtnText: { fontWeight: "600", fontSize: 14 },
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
    height: 48,
    fontSize: 15,
    color: "#000000",
    marginLeft: 10,
  },
  registerBtn: { marginTop: 10 },
  gradientBtn: {
    borderRadius: 15,
    paddingVertical: 18,
    alignItems: "center",
  },
  registerBtnText: { color: WHITE, fontSize: 16, fontWeight: "700", letterSpacing: 1 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 10 },
  footerText: { color: MUTED, fontSize: 14 },
  footerLink: { color: PRIMARY, fontWeight: "700", fontSize: 14 },
  animationContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 20 },
  loadingTitle: { fontSize: 22, fontWeight: "700", color: PRIMARY, textAlign: "center" },
  loadingSub: { fontSize: 14, color: MUTED, textAlign: "center", maxWidth: "80%" },
  familyCard: {
    backgroundColor: PRIMARY_SOFT,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: `${PRIMARY}33`,
    padding: 16,
    gap: 8,
  },
  familyCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  familyCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: PRIMARY,
  },
  familyCardSub: {
    fontSize: 13,
    color: `${PRIMARY}99`,
    lineHeight: 18,
  },
});
