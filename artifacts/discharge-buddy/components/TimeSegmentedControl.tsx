import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Text,
} from "react-native";
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const CONTAINER_WIDTH = width - 32;

interface TimeSegmentedControlProps {
  options: { label: string; icon: any; color: string; emoji: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function TimeSegmentedControl({ options, value, onChange }: TimeSegmentedControlProps) {
  const selectedIndex = options.findIndex((opt) => opt.label === value);
  const segmentWidth = (CONTAINER_WIDTH - 8) / options.length;

  const translateX = useRef(new Animated.Value(selectedIndex * segmentWidth)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: selectedIndex * segmentWidth,
      useNativeDriver: true,
      tension: 60,
      friction: 9,
    }).start();
  }, [selectedIndex]);

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        {/* Sliding Background */}
        <Animated.View
          style={[
            styles.slider,
            {
              width: segmentWidth,
              transform: [{ translateX }],
              backgroundColor: options[selectedIndex]?.color || "#6C47FF",
            },
          ]}
        />

        {/* Options */}
        {options.map((opt, i) => {
          const isActive = i === selectedIndex;
          return (
            <TouchableOpacity
              key={opt.label}
              onPress={() => onChange(opt.label)}
              style={[styles.segment, { width: segmentWidth }]}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 16, marginBottom: 2 }}>{opt.emoji}</Text>
              <Text
                style={[
                  styles.label,
                  { color: isActive ? "#FFFFFF" : "#64748B" },
                  isActive && styles.labelActive,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {opt.label.split(" ")[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  track: {
    width: "100%",
    height: 60,
    backgroundColor: "#F1F5F9",
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    position: "relative",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  slider: {
    position: "absolute",
    height: 52,
    borderRadius: 26,
    left: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  segment: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  labelActive: {
    fontFamily: "Inter_700Bold",
  },
});
