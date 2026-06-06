import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from 'react-native';
import { TranslateText as Text } from '@/components/TranslateText';
import Svg, { Circle } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

interface Props {
  taken: number;
  total: number;
  size?: number;
}

export function AdherenceRing({ taken, total, size = 100 }: Props) {
  const colors = useColors();
  const animValue = useRef(new Animated.Value(0)).current;

  const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: percentage / 100,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const getColor = () => {
    if (percentage >= 80) return colors.success;
    if (percentage >= 50) return colors.warning;
    return colors.destructive;
  };

  const ringColor = getColor();

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`${ringColor}20`}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference - (circumference * percentage) / 100}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.percent, { color: ringColor }]}>{percentage}%</Text>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>taken</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  svg: {
    position: "absolute",
  },
  center: {
    alignItems: "center",
  },
  percent: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
