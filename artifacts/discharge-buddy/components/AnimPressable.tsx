import React, { useRef } from "react";
import { Animated, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";

interface AnimPressableProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleDownTo?: number;
  disabled?: boolean;
}

export function AnimPressable({ onPress, children, style, scaleDownTo = 0.93, disabled = false }: AnimPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const { hapticsEnabled } = useApp();

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: scaleDownTo, useNativeDriver: true, friction: 8, tension: 150 }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 100 }).start();
  };

  const handlePress = () => {
    if (disabled) return;
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}
