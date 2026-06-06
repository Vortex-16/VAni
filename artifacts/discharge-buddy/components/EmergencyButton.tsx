import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import { Alert, Animated, StyleSheet, TouchableOpacity, View, Linking } from 'react-native';
import { TranslateText as Text } from '@/components/TranslateText';

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export function EmergencyButton() {
  const colors = useColors();
  const { triggerEmergency } = useApp();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);

  const handlePress = () => {
    if (pressed) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.05, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    Alert.alert(
      "Emergency Help",
      "This will call the National Emergency Number (112) and notify your caregiver. Do you want to proceed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Call 112",
          style: "destructive",
          onPress: () => {
            triggerEmergency();
            setPressed(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Linking.openURL("tel:112");
            setTimeout(() => setPressed(false), 5000);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          onPress={handlePress}
          style={[styles.button, { backgroundColor: pressed ? colors.success : colors.emergency }]}
          activeOpacity={0.8}
        >
          <Feather name={pressed ? "check" : "alert-triangle"} size={28} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {pressed ? "Alert sent to caregiver" : "Emergency Alert"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
});
