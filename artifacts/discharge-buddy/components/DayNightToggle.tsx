import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Text,
} from "react-native";
import { Feather } from "@expo/vector-icons";

interface DayNightToggleProps {
  value: "morning" | "evening";
  onChange: (value: "morning" | "evening") => void;
}

export function DayNightToggle({ value, onChange }: DayNightToggleProps) {
  const isMorning = value === "morning";

  // Animation value: 0 for morning, 1 for evening
  const animValue = useRef(new Animated.Value(isMorning ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: isMorning ? 0 : 1,
      useNativeDriver: false,
      duration: 350, // Smooth glide duration
    }).start();
  }, [isMorning, animValue]);

  // Interpolations
  const togglePosition = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 116], // 160 width - 40 thumb - 4 padding
  });

  const bgColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["#38BDF8", "#1E1B4B"], // light blue to deep night blue
  });

  const thumbColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["#FBBF24", "#F8FAFC"], // Sun yellow to Moon white
  });

  const sunOpacity = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  const moonOpacity = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <TouchableWithoutFeedback
      onPress={() => onChange(isMorning ? "evening" : "morning")}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.track, { backgroundColor: bgColor }]}>
          {/* Background Elements */}
          <Animated.View style={[styles.bgElement, { opacity: sunOpacity, left: 16 }]}>
             <Feather name="cloud" size={24} color="rgba(255,255,255,0.7)" />
          </Animated.View>
          <Animated.View style={[styles.bgElement, { opacity: moonOpacity, right: 16, flexDirection: 'row', gap: 6 }]}>
             {/* Replaced star emojis with clean subtle dots to represent distant stars */}
             <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: "rgba(255,255,255,0.3)", marginTop: 8 }} />
             <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.5)" }} />
             <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.2)", marginTop: 12 }} />
          </Animated.View>

          {/* Labels Overlay (Crossfaded to prevent overlap) */}
          <View style={styles.labelsContainer}>
            <Animated.Text 
              style={[
                styles.label, 
                { opacity: sunOpacity, right: 38, color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: 0.5 }
              ]}
            >
              DAY
            </Animated.Text>
            <Animated.Text 
              style={[
                styles.label, 
                { opacity: moonOpacity, left: 32, color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: 0.5 }
              ]}
            >
              NIGHT
            </Animated.Text>
          </View>

          {/* Sliding Thumb */}
          <Animated.View
            style={[
              styles.thumb,
              {
                transform: [{ translateX: togglePosition }],
                backgroundColor: thumbColor,
              },
            ]}
          >
            <Animated.View style={{ position: "absolute", opacity: sunOpacity }}>
               <View style={styles.sunInner} />
            </Animated.View>
            <Animated.View style={{ position: "absolute", opacity: moonOpacity }}>
               <View style={styles.moonCraters} />
            </Animated.View>
          </Animated.View>

        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    marginVertical: 16,
  },
  track: {
    width: 160,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.1)",
    overflow: "hidden",
  },
  bgElement: {
    position: "absolute",
    justifyContent: "center",
  },
  thumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    position: "absolute",
    top: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  sunInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F59E0B",
    opacity: 0.5,
  },
  moonCraters: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(0,0,0,0.1)",
    top: -12,
    left: 2,
  },
  labelsContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    pointerEvents: "none",
  },
  label: {
    position: "absolute",
    fontSize: 14,
  },
});
