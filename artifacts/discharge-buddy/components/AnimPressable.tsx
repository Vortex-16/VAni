import React, { useRef } from "react";
import { Animated, TouchableOpacity, StyleProp, ViewStyle, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";

interface AnimPressableProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleDownTo?: number;
  disabled?: boolean;
}

const LAYOUT_PROPERTIES = new Set([
  "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight",
  "flex", "flexGrow", "flexShrink", "flexBasis",
  "margin", "marginTop", "marginBottom", "marginLeft", "marginRight",
  "marginHorizontal", "marginVertical", "marginStart", "marginEnd",
  "position", "top", "bottom", "left", "right", "start", "end",
  "alignSelf", "zIndex", "aspectRatio"
]);

function splitStyles(style: any) {
  const containerStyle: any = {};
  const innerStyle: any = {};

  if (!style) return { containerStyle, innerStyle };

  const flatStyle = StyleSheet.flatten(style);

  for (const key in flatStyle) {
    if (LAYOUT_PROPERTIES.has(key)) {
      containerStyle[key] = flatStyle[key];
      
      // Mirror width/height dimensions on the inner view to ensure it matches the container bounds
      if (["width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight"].includes(key)) {
        innerStyle[key] = flatStyle[key];
      }
    } else {
      innerStyle[key] = flatStyle[key];
    }
  }

  // Ensure inner style fills container if layout dictates it
  if (containerStyle.width && !innerStyle.width) {
    innerStyle.width = "100%";
  }
  if (containerStyle.height && !innerStyle.height) {
    innerStyle.height = "100%";
  }

  return { containerStyle, innerStyle };
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

  const { containerStyle, innerStyle } = splitStyles(style);

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      disabled={disabled}
      style={containerStyle}
    >
      <Animated.View style={[innerStyle, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}
