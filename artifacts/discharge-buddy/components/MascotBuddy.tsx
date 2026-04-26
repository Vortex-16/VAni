import React, { useEffect, useState, useRef } from "react";
import * as Haptics from "expo-haptics";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  interpolate,
  useAnimatedProps,
  SharedValue,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Ellipse,
  Path,
  G,
} from "react-native-svg";
import { BlurView } from "expo-blur";
import { t } from "@/constants/translations";
import { useApp } from "@/context/AppContext";
import { getDynamicMessage } from "@/utils/MessageEngine";
import { Feather } from "@expo/vector-icons";
import { NeuralOrb } from "./NeuralOrb";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export type MascotMood = "HAPPY" | "CELEBRATE" | "CONCERNED" | "LOVE" | "NEUTRAL";

const MESSAGES: Record<MascotMood, string[]> = {
  HAPPY: [
    "Hi! I'm Mr. Meddy 🐾 Let's have a great recovery day!",
    "Remember to take your medicine on time! 💊",
    "You're doing amazing! Keep it up! ⭐",
  ],
  CELEBRATE: [
    "YES! Task complete! You're a rockstar! 🎉",
    "Medicine taken! Your body thanks you! ❤️",
    "One step closer to full recovery! 🌟",
  ],
  CONCERNED: [
    "Oh no! We missed a dose. Let's get back on track! 😟",
    "Feeling okay? Don't forget your check-in! 🩺",
  ],
  LOVE: [
    "Aww, thank you for taking care of yourself! 🥰",
    "Sending you healing vibes! ✨",
  ],
  NEUTRAL: [
    "Staying steady is key to recovery! 📈",
    "I'm here to support you every step of the way.",
  ],
};

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

function BearSvg({ 
  size = 90, 
  mood = "HAPPY",
  blink,
  mouthOpen 
}: { 
  size?: number; 
  mood?: MascotMood;
  blink: SharedValue<number>;
  mouthOpen: SharedValue<number>;
}) {
  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: 1 - blink.value }]
  }));

  const mouthProps = useAnimatedProps(() => ({
    transform: [{ scaleY: 1 + mouthOpen.value * 0.5 }]
  }));

  const renderEyes = () => {
    if (mood === "CELEBRATE") {
      return (
        <G>
          <Path d="M 28 48 Q 33 42 38 48" stroke="#1E1B4B" strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M 52 48 Q 57 42 62 48" stroke="#1E1B4B" strokeWidth={3} fill="none" strokeLinecap="round" />
        </G>
      );
    }
    if (mood === "LOVE") {
      return (
        <G>
          <Path d="M 28 46 C 28 43 32 42 33 44 C 34 42 38 43 38 46 C 38 49 33 52 33 52 C 33 52 28 49 28 46 Z" fill="#EF4444" />
          <Path d="M 52 46 C 52 43 56 42 57 44 C 58 42 62 43 62 46 C 62 49 57 52 57 52 C 57 52 52 49 52 46 Z" fill="#EF4444" />
        </G>
      );
    }
    return (
      <G>
        <G transform="translate(33, 46)">
           <AnimatedEllipse rx={7} ry={7} fill="#fff" animatedProps={eyeProps} />
           <AnimatedCircle cx={1} cy={1} r={4.5} fill="#1E1B4B" />
        </G>
        <G transform="translate(57, 46)">
           <AnimatedEllipse rx={7} ry={7} fill="#fff" animatedProps={eyeProps} />
           <AnimatedCircle cx={1} cy={1} r={4.5} fill="#1E1B4B" />
        </G>
      </G>
    );
  };

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 90 90">
        {/* Left ear outer */}
        <Circle cx={18} cy={24} r={15} fill="#7C3AED" />
        <Circle cx={18} cy={24} r={9} fill="#DDD6FE" />
        {/* Right ear outer */}
        <Circle cx={72} cy={24} r={15} fill="#7C3AED" />
        <Circle cx={72} cy={24} r={9} fill="#DDD6FE" />
        
        {/* Head */}
        <Circle cx={45} cy={52} r={36} fill="#FFF8F0" />
        <Ellipse cx={45} cy={86} rx={22} ry={5} fill="#EDE9FE" opacity={0.6} />

        {/* Eyes handled via conditional G and Animated views for scaling pupils */}
        {mood === "CELEBRATE" || mood === "LOVE" ? (
          renderEyes()
        ) : (
          <G>
            <G transform="translate(33, 46)">
              <AnimatedEllipse rx={7} ry={7} fill="#fff" animatedProps={eyeProps} />
              <AnimatedEllipse rx={4.5} ry={4.5} fill="#1E1B4B" animatedProps={eyeProps} />
            </G>
            <G transform="translate(57, 46)">
              <AnimatedEllipse rx={7} ry={7} fill="#fff" animatedProps={eyeProps} />
              <AnimatedEllipse rx={4.5} ry={4.5} fill="#1E1B4B" animatedProps={eyeProps} />
            </G>
          </G>
        )}

        {/* Nose */}
        <Ellipse cx={45} cy={57} rx={5} ry={3.5} fill="#7C3AED" />

        {/* Mouth */}
        <G transform="translate(45, 62)">
          <AnimatedPath
            d={mood === "CONCERNED" ? "M -5 2 Q 0 -1 5 2" : "M -5 0 Q 0 6 5 0"}
            stroke="#7C3AED"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            animatedProps={mouthProps}
          />
        </G>

        {/* Blush */}
        <Ellipse cx={27} cy={58} rx={7} ry={4.5} fill="#F9A8D4" opacity={mood === "LOVE" ? 0.8 : 0.55} />
        <Ellipse cx={63} cy={58} rx={7} ry={4.5} fill="#F9A8D4" opacity={mood === "LOVE" ? 0.8 : 0.55} />

        {/* Paws */}
        <G>
          <Circle cx={14} cy={72} r={8} fill="#7C3AED" />
          <Circle cx={76} cy={72} r={8} fill="#7C3AED" />
        </G>

        {/* Belly */}
        <Ellipse cx={45} cy={62} rx={16} ry={12} fill="#EDE9FE" opacity={0.7} />
        <Path
          d="M 41 61 C 41 58.5 44 57 45 59 C 46 57 49 58.5 49 61 C 49 63.5 45 67 45 67 C 45 67 41 63.5 41 61 Z"
          fill="#A78BFA"
          opacity={0.8}
        />
      </Svg>
    </View>
  );
}

interface MascotBuddyProps {
  message?: string;
  size?: number;
  trigger?: number;
  mood?: MascotMood;
}

export function MascotBuddy({ message, size = 90, trigger, mood: initialMood = "HAPPY" }: MascotBuddyProps) {
  const { todayDoses, user, isSpeaking, speakingTargetId, speakNeural } = useApp();
  const [mood, setMood] = useState<MascotMood>(initialMood);

  const isMeSpeaking = isSpeaking && speakingTargetId === "mascot_beary";
  
  const getInitialMsg = () => {
    if (message) return message;
    return getDynamicMessage(todayDoses || [], new Date(), user?.name);
  };

  const [msg, setMsg] = useState(getInitialMsg());
  
  const float = useSharedValue(0);
  const scale = useSharedValue(0);
  const blink = useSharedValue(0);
  const mouthOpen = useSharedValue(0);
  const bubbleOpacity = useSharedValue(0);
  const bubbleScale = useSharedValue(0.95);
  const bubbleTranslateY = useSharedValue(10);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 80 });
    
    float.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    const blinkInterval = setInterval(() => {
      if (Math.random() > 0.6) {
        blink.value = withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(0, { duration: 100 })
        );
      }
    }, 3000);

    setTimeout(() => {
      bubbleOpacity.value = withTiming(1, { duration: 800 });
      bubbleTranslateY.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) });
      bubbleScale.value = withTiming(1, { duration: 800 }, () => {
        bubbleScale.value = withRepeat(
          withSequence(
            withTiming(1.02, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
            withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        );
      });
    }, 300);

    return () => clearInterval(blinkInterval);
  }, []);

  useEffect(() => {
    if (isMeSpeaking) {
      mouthOpen.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 150 }),
          withTiming(0, { duration: 150 })
        ),
        -1,
        true
      );
    } else {
      mouthOpen.value = withTiming(0);
    }
  }, [isMeSpeaking]);
  
  // Keep msg in sync with the message prop if it changes
  useEffect(() => {
    if (message) {
      setMsg(message);
    } else {
      setMsg(getDynamicMessage(todayDoses || [], new Date(), user?.name));
    }
  }, [message, todayDoses, user?.name]);

  useEffect(() => {
    if (trigger === undefined) return;
    
    const targetMood = mood === "HAPPY" ? "CELEBRATE" : mood;
    setMood(targetMood);
    
    if (!message) {
      setMsg(getDynamicMessage(todayDoses || [], new Date(), user?.name));
    } else {
      setMsg(message);
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    scale.value = withSequence(
      withTiming(0.85, { duration: 80 }),
      withSpring(1.25, { damping: 6, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 150 })
    );

    mouthOpen.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(1500, withTiming(0, { duration: 300 }))
    );

    const timer = setTimeout(() => {
      setMood("HAPPY");
    }, 4000);

    return () => clearTimeout(timer);
  }, [trigger]);

  const handleSpeak = async () => {
    await speakNeural(msg, "mascot_beary");
  };

  const bearStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: float.value },
    ],
  }));

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [
      { scale: bubbleScale.value },
      { translateY: bubbleTranslateY.value }
    ],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.bubbleContainer, bubbleStyle]}>
        <TouchableOpacity 
          style={styles.solidCard} 
          onPress={handleSpeak}
          activeOpacity={0.8}
        >
          <View style={styles.bubbleHeader}>
            <Text style={styles.bubbleText}>{msg || "Hello! 💜"}</Text>
            <View style={styles.voiceIcon}>
              <Feather name={isMeSpeaking ? "pause" : "volume-2"} size={14} color="#7C3AED" />
            </View>
          </View>
          {isMeSpeaking && (
            <View style={styles.orbMini}>
              <NeuralOrb isSpeaking={true} isProcessing={false} />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={[styles.bearWrapper, bearStyle]}>
        <BearSvg size={size} mood={mood} blink={blink} mouthOpen={mouthOpen} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    marginVertical: 6,
  },
  bubbleContainer: {
    flex: 1,
    marginRight: 16,
    marginBottom: 24,
    alignItems: "flex-end",
  },
  solidCard: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
    maxWidth: 240,
  },
  bubbleText: {
    color: "#1E1B4B",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    lineHeight: 22,
    letterSpacing: -0.2,
    textAlign: "left",
    flexShrink: 1,
  },
  bubbleHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  voiceIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  orbMini: {
    position: 'absolute',
    bottom: -15,
    right: -10,
    transform: [{ scale: 0.4 }],
  },
  bearWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
});
