import React, { useEffect } from "react";
import * as Haptics from "expo-haptics";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Ellipse,
  Path,
  Rect,
  G,
} from "react-native-svg";

const MESSAGES = [
  "Hi! I'm Beary 🐾 Let's have a great recovery day!",
  "Remember to take your medicine on time! 💊",
  "You're doing amazing! Keep it up! ⭐",
  "Stay hydrated and rest well today! 💧",
  "Small steps lead to big recovery! 🌟",
];

function BearSvg({ size = 90 }: { size?: number }) {
  const s = size / 90;
  return (
    <Svg width={size} height={size} viewBox="0 0 90 90">
      {/* Left ear outer */}
      <Circle cx={18} cy={24} r={15} fill="#7C3AED" />
      {/* Left ear inner */}
      <Circle cx={18} cy={24} r={9} fill="#DDD6FE" />

      {/* Right ear outer */}
      <Circle cx={72} cy={24} r={15} fill="#7C3AED" />
      {/* Right ear inner */}
      <Circle cx={72} cy={24} r={9} fill="#DDD6FE" />

      {/* Head */}
      <Circle cx={45} cy={52} r={36} fill="#FFF8F0" />

      {/* Body shadow */}
      <Ellipse cx={45} cy={86} rx={22} ry={5} fill="#EDE9FE" opacity={0.6} />

      {/* Left eye white */}
      <Circle cx={33} cy={46} r={7} fill="#fff" />
      {/* Right eye white */}
      <Circle cx={57} cy={46} r={7} fill="#fff" />

      {/* Left pupil */}
      <Circle cx={34} cy={47} r={4.5} fill="#1E1B4B" />
      {/* Right pupil */}
      <Circle cx={58} cy={47} r={4.5} fill="#1E1B4B" />

      {/* Left eye shine */}
      <Circle cx={36} cy={44} r={1.8} fill="#fff" />
      {/* Right eye shine */}
      <Circle cx={60} cy={44} r={1.8} fill="#fff" />

      {/* Nose */}
      <Ellipse cx={45} cy={57} rx={5} ry={3.5} fill="#7C3AED" />

      {/* Mouth */}
      <Path
        d="M 40 62 Q 45 68 50 62"
        stroke="#7C3AED"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />

      {/* Left blush */}
      <Ellipse cx={27} cy={58} rx={7} ry={4.5} fill="#F9A8D4" opacity={0.55} />
      {/* Right blush */}
      <Ellipse cx={63} cy={58} rx={7} ry={4.5} fill="#F9A8D4" opacity={0.55} />

      {/* Left paw */}
      <Circle cx={14} cy={72} r={8} fill="#7C3AED" />
      <Circle cx={10} cy={69} r={3} fill="#A78BFA" />
      <Circle cx={18} cy={69} r={3} fill="#A78BFA" />
      <Circle cx={14} cy={79} r={2.5} fill="#A78BFA" />

      {/* Right paw */}
      <Circle cx={76} cy={72} r={8} fill="#7C3AED" />
      <Circle cx={72} cy={69} r={3} fill="#A78BFA" />
      <Circle cx={80} cy={69} r={3} fill="#A78BFA" />
      <Circle cx={76} cy={79} r={2.5} fill="#A78BFA" />

      {/* Belly */}
      <Ellipse cx={45} cy={62} rx={16} ry={12} fill="#EDE9FE" opacity={0.7} />

      {/* Heart on belly */}
      <Path
        d="M 41 61 C 41 58.5 44 57 45 59 C 46 57 49 58.5 49 61 C 49 63.5 45 67 45 67 C 45 67 41 63.5 41 61 Z"
        fill="#A78BFA"
        opacity={0.8}
      />
    </Svg>
  );
}

interface MascotBuddyProps {
  message?: string;
  size?: number;
  trigger?: number;
}

export function MascotBuddy({ message, size = 90, trigger }: MascotBuddyProps) {
  const float = useSharedValue(0);
  const scale = useSharedValue(0);
  const pawWave = useSharedValue(0);
  const bubbleOpacity = useSharedValue(0);
  const bubbleScale = useSharedValue(0.8);

  const displayMessage = message ?? MESSAGES[Math.floor(Date.now() / 30000) % MESSAGES.length];

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 80 });

    float.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    pawWave.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 400, easing: Easing.out(Easing.quad) }),
        withTiming(8, { duration: 400, easing: Easing.out(Easing.quad) }),
        withTiming(-8, { duration: 350, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 350 }),
        withTiming(0, { duration: 2400 })
      ),
      -1,
      false
    );

    setTimeout(() => {
      bubbleOpacity.value = withSpring(1);
      bubbleScale.value = withSpring(1, { damping: 12 });
    }, 700);
  }, []);

  useEffect(() => {
    if (trigger === undefined) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Fun Duolingo-style Pop
    scale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1.08, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 150 })
    );

    // Dynamic paw wave reset to emphasize reaction
    pawWave.value = withSequence(
      withTiming(-18, { duration: 150, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(12, { duration: 150, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 200, easing: Easing.bounce })
    );
  }, [trigger]);

  const bearStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: float.value },
    ],
  }));

  const pawStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${pawWave.value}deg` }],
  }));

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [{ scale: bubbleScale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.bubbleContainer, bubbleStyle]}>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{displayMessage}</Text>
        </View>
        <View style={styles.bubbleTail} />
      </Animated.View>

      <Animated.View style={[styles.bearWrapper, bearStyle]}>
        <BearSvg size={size} />
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
    marginRight: 8,
    marginBottom: 16,
    alignItems: "flex-end",
  },
  bubble: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
    maxWidth: 220,
  },
  bubbleText: {
    color: "#1E1B4B",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
  bubbleTail: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
    marginRight: 18,
    marginTop: -1,
  },
  bearWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
});
