import React, { useEffect, useState } from "react";
import * as Haptics from "expo-haptics";
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { TranslateText as Text } from '@/components/TranslateText';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  useAnimatedProps,
  SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, Path, G } from "react-native-svg";
import { useApp } from "@/context/AppContext";
import { getDynamicMessage } from "@/utils/MessageEngine";
import { Feather } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export type MascotMood = "HAPPY" | "CELEBRATE" | "CONCERNED" | "LOVE" | "NEUTRAL";

const AnimatedPath    = Animated.createAnimatedComponent(Path);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle  = Animated.createAnimatedComponent(Circle);

function BearSvg({
  size = 90,
  mood = "HAPPY",
  blink,
  mouthOpen,
}: {
  size?: number;
  mood?: MascotMood;
  blink: SharedValue<number>;
  mouthOpen: SharedValue<number>;
}) {
  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value > 0.5 ? 0.1 : 1 }],
  }));
  const mouthProps = useAnimatedProps(() => ({
    transform: [{ scaleY: 1 + mouthOpen.value * 0.5 }],
  }));

  const renderSpecialEyes = () => {
    if (mood === "CELEBRATE") return (
      <G>
        <Path d="M 28 48 Q 33 42 38 48" stroke="#1E1B4B" strokeWidth={3} fill="none" strokeLinecap="round" />
        <Path d="M 52 48 Q 57 42 62 48" stroke="#1E1B4B" strokeWidth={3} fill="none" strokeLinecap="round" />
      </G>
    );
    if (mood === "LOVE") return (
      <G>
        <Path d="M 28 46 C 28 43 32 42 33 44 C 34 42 38 43 38 46 C 38 49 33 52 33 52 C 33 52 28 49 28 46 Z" fill="#EF4444" />
        <Path d="M 52 46 C 52 43 56 42 57 44 C 58 42 62 43 62 46 C 62 49 57 52 57 52 C 57 52 52 49 52 46 Z" fill="#EF4444" />
      </G>
    );
    return null;
  };

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 90 90">
        {/* Ears */}
        <Circle cx={18} cy={24} r={15} fill="#7C3AED" />
        <Circle cx={18} cy={24} r={9}  fill="#DDD6FE" />
        <Circle cx={72} cy={24} r={15} fill="#7C3AED" />
        <Circle cx={72} cy={24} r={9}  fill="#DDD6FE" />
        
        {/* Face base */}
        <Circle cx={45} cy={52} r={36} fill="#FFF8F0" />
        
        {/* Shadow under chin */}
        <Ellipse cx={45} cy={86} rx={22} ry={5} fill="#EDE9FE" opacity={0.5} />

        {/* Eyes */}
        {mood === "CELEBRATE" || mood === "LOVE" ? renderSpecialEyes() : (
          <G>
            <G transform="translate(33,46)">
              <AnimatedEllipse rx={7} ry={7} fill="#fff" animatedProps={eyeProps} />
              <Circle r={4.5} fill="#1E1B4B" />
            </G>
            <G transform="translate(57,46)">
              <AnimatedEllipse rx={7} ry={7} fill="#fff" animatedProps={eyeProps} />
              <Circle r={4.5} fill="#1E1B4B" />
            </G>
          </G>
        )}

        {/* Nose */}
        <Ellipse cx={45} cy={57} rx={5} ry={3.5} fill="#7C3AED" />
        
        {/* Mouth */}
        <G transform="translate(45,62)">
          <AnimatedPath
            d={mood === "CONCERNED" ? "M -5 2 Q 0 -1 5 2" : "M -6 0 Q 0 8 6 0"}
            stroke="#7C3AED" strokeWidth={2} fill="none" strokeLinecap="round"
            animatedProps={mouthProps}
          />
        </G>
        
        {/* Cheeks */}
        <Ellipse cx={27} cy={58} rx={7} ry={4.5} fill="#F9A8D4" opacity={mood === "LOVE" ? 0.8 : 0.5} />
        <Ellipse cx={63} cy={58} rx={7} ry={4.5} fill="#F9A8D4" opacity={mood === "LOVE" ? 0.8 : 0.5} />
        
        {/* Snout highlight */}
        <Ellipse cx={45} cy={62} rx={16} ry={12} fill="#EDE9FE" opacity={0.7} />
        <Path d="M 41 61 C 41 58.5 44 57 45 59 C 46 57 49 58.5 49 61 C 49 63.5 45 67 45 67 C 45 67 41 63.5 41 61 Z" fill="#A78BFA" opacity={0.8} />
      </Svg>
    </View>
  );
}

interface MascotBuddyProps {
  message?: string;
  size?: number;
  trigger?: number;
  mood?: MascotMood;
  showCards?: boolean; // Kept for compatibility but unused to ensure no crashes
}

export function MascotBuddy({
  message,
  size = 90,
  trigger,
  mood: initialMood = "HAPPY",
}: MascotBuddyProps) {
  const { todayDoses, user, isSpeaking, speakingTargetId, speakNeural } = useApp();
  const [mood, setMood] = useState<MascotMood>(initialMood);

  const isMeSpeaking = isSpeaking && speakingTargetId === "mascot_beary";

  const getInitialMsg = () => message ?? getDynamicMessage(todayDoses || [], new Date(), user?.name);
  const [msg, setMsg] = useState(getInitialMsg());

  // Animations
  const float = useSharedValue(0);
  const scale = useSharedValue(0);
  const blink = useSharedValue(0);
  const mouthOpen = useSharedValue(0);
  const sway = useSharedValue(0);

  const bubbleOpacity = useSharedValue(0);
  const bubbleScale = useSharedValue(0.95);
  const bubbleTranslateY = useSharedValue(10);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 80 });

    float.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ), -1, true
    );
    
    sway.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 2200 }),
        withTiming(-3, { duration: 2200 })
      ), -1, true
    );

    const blinkInterval = setInterval(() => {
      if (Math.random() > 0.5) {
        blink.value = withSequence(
          withTiming(1, { duration: 90 }),
          withTiming(0, { duration: 90 })
        );
      }
    }, 2800);

    setTimeout(() => {
      bubbleOpacity.value = withTiming(1, { duration: 800 });
      bubbleTranslateY.value = withTiming(0, { duration: 800 });
      bubbleScale.value = withTiming(1, { duration: 800 }, () => {
        bubbleScale.value = withRepeat(
          withSequence(
            withTiming(1.015, { duration: 2200 }),
            withTiming(1, { duration: 2200 })
          ), -1, true
        );
      });
    }, 300);

    return () => clearInterval(blinkInterval);
  }, []);

  useEffect(() => {
    if (isMeSpeaking) {
      mouthOpen.value = withRepeat(
        withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 150 })),
        -1, true
      );
    } else {
      mouthOpen.value = withTiming(0);
    }
  }, [isMeSpeaking]);

  useEffect(() => {
    if (message) setMsg(message);
    else setMsg(getDynamicMessage(todayDoses || [], new Date(), user?.name));
  }, [message, todayDoses, user?.name]);

  useEffect(() => {
    if (trigger === undefined) return;
    const targetMood = mood === "HAPPY" ? "CELEBRATE" : mood;
    setMood(targetMood);
    if (!message) setMsg(getDynamicMessage(todayDoses || [], new Date(), user?.name));
    else setMsg(message);
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
    const timer = setTimeout(() => setMood("HAPPY"), 4000);
    return () => clearTimeout(timer);
  }, [trigger]);

  const handleSpeak = async () => {
    const cleanMsg = msg.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
    await speakNeural(cleanMsg, "mascot_beary");
  };

  const bearStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: float.value },
      { rotate: `${sway.value}deg` },
    ],
  }));

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [
      { scale: bubbleScale.value },
      { translateY: bubbleTranslateY.value },
    ],
  }));

  // Ensure the component renders strictly top-to-bottom: Bubble above Bear
  return (
    <View style={styles.outerWrapper}>
      <Animated.View style={bearStyle}>
        <BearSvg size={size} mood={mood} blink={blink} mouthOpen={mouthOpen} />
      </Animated.View>

      <Animated.View style={[styles.bubbleContainer, bubbleStyle]}>
        <View style={styles.bubblePointerLeft} />
        <TouchableOpacity style={styles.solidCard} onPress={handleSpeak} activeOpacity={0.8}>
          <View style={styles.bubbleHeader}>
            <Text style={styles.bubbleText}>{msg || "Hello!"}</Text>
            <View style={styles.voiceIcon}>
              <Feather name={isMeSpeaking ? "pause" : "volume-2"} size={16} color="#7C3AED" />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    marginVertical: 6,
    width: "100%",
    gap: 2,
  },
  bubbleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1, // Let the bubble take up remaining horizontal space
    zIndex: 10,
  },
  solidCard: {
    backgroundColor: "rgba(255,255,255,0.97)",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  bubblePointerLeft: {
    width: 0, height: 0, backgroundColor: "transparent",
    borderStyle: "solid",
    borderTopWidth: 8, borderBottomWidth: 8, borderRightWidth: 12,
    borderTopColor: "transparent", borderBottomColor: "transparent",
    borderRightColor: "rgba(255,255,255,0.97)",
    marginRight: -1, // Overlap border slightly
  },
  bubbleText: {
    color: "#1E1B4B",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    lineHeight: 22,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  bubbleHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  voiceIcon: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },
});
