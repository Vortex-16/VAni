import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from 'react-native';
import { TranslateText as Text } from '@/components/TranslateText';

import { useColors } from "@/hooks/useColors";

type RiskLevel = "low" | "medium" | "high";

interface Props {
  level: RiskLevel;
  message: string;
}

export function RiskBanner({ level, message }: Props) {
  const colors = useColors();

  const config = {
    low: {
      bg: `${colors.success}15`,
      border: colors.success,
      icon: "check-circle" as const,
      color: colors.success,
    },
    medium: {
      bg: `${colors.warning}15`,
      border: colors.warning,
      icon: "alert-circle" as const,
      color: colors.warning,
    },
    high: {
      bg: `${colors.destructive}15`,
      border: colors.destructive,
      icon: "alert-triangle" as const,
      color: colors.destructive,
    },
  }[level];

  return (
    <View style={[styles.banner, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Feather name={config.icon} size={18} color={config.color} />
      <Text style={[styles.text, { color: config.color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
});
