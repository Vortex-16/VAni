import React, { useEffect, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSpeechToText } from "../hooks/useSpeechToText";
import { useApp } from "../context/AppContext";
import * as Haptics from "expo-haptics";

interface VoiceInputButtonProps {
  onTranscriptionComplete: (text: string) => void;
  onListeningStateChange?: (isListening: boolean) => void;
  onTranscribingStateChange?: (isTranscribing: boolean) => void;
  disabled?: boolean;
}

const PURPLE = "#6C47FF";
const RED = "#EF4444";

export function VoiceInputButton({
  onTranscriptionComplete,
  onListeningStateChange,
  onTranscribingStateChange,
  disabled = false,
}: VoiceInputButtonProps) {
  const { hapticsEnabled } = useApp();
  
  const {
    isListening,
    isTranscribing,
    error,
    metering,
    startListening,
    stopListening,
    cancelListening,
  } = useSpeechToText(onTranscriptionComplete);

  // Sync listening and transcribing states to parent component if callbacks exist
  useEffect(() => {
    if (onListeningStateChange) {
      onListeningStateChange(isListening);
    }
  }, [isListening, onListeningStateChange]);

  useEffect(() => {
    if (onTranscribingStateChange) {
      onTranscribingStateChange(isTranscribing);
    }
  }, [isTranscribing, onTranscribingStateChange]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.warn("[VoiceInputButton] STT Error:", error);
      if (hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [error, hapticsEnabled]);

  // Pulsing animation scale based on real-time audio levels (metering ranges from -160 to 0)
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isListening) {
      // Normalize metering to a value between 0 and 1
      const db = Math.max(-60, Math.min(0, metering)); // Clamp between -60dB (silence) and 0dB (loudest)
      const normalized = (db + 60) / 60; // 0 (silent) to 1 (loud)
      
      Animated.timing(pulseScale, {
        toValue: 1 + normalized * 0.7, // Maps to scale 1.0 to 1.7
        duration: 100,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(pulseScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
      }).start();
    }
  }, [metering, isListening, pulseScale]);

  const handlePress = async () => {
    if (disabled || isTranscribing) return;

    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  };

  const handleCancel = async () => {
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    await cancelListening();
  };

  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        {/* Cancel button - discard recording */}
        {isListening && (
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.cancelBtn}
            activeOpacity={0.7}
          >
            <Feather name="x" size={14} color="#FFF" />
          </TouchableOpacity>
        )}

        <View style={styles.buttonWrapper}>
          {/* Pulsing ring animation while recording */}
          {isListening && (
            <Animated.View
              style={[
                styles.pulseRing,
                { transform: [{ scale: pulseScale }] }
              ]}
            />
          )}

          <TouchableOpacity
            onPress={handlePress}
            disabled={disabled || isTranscribing}
            style={[
              styles.micBtn,
              isListening && styles.micBtnListening,
              isTranscribing && styles.micBtnTranscribing,
              disabled && styles.micBtnDisabled,
            ]}
            activeOpacity={0.8}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : isListening ? (
              <Animated.View style={[styles.innerOrb, { transform: [{ scale: pulseScale }] }]} />
            ) : (
              <Feather name="mic" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Status label */}
      {isListening ? (
        <Text style={styles.listeningLabel}>Listening... (Auto-sends)</Text>
      ) : isTranscribing ? (
        <Text style={styles.transcribingLabel}>Sending...</Text>
      ) : error ? (
        <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
      ) : null}
    </View>
  );
}


const styles = StyleSheet.create({
  outerContainer: {
    flexDirection: "column",
    alignItems: "center",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  errorText: {
    fontSize: 10,
    color: "#EF4444",
    marginTop: 4,
    maxWidth: 160,
    textAlign: "center",
  },
  listeningLabel: {
    fontSize: 10,
    color: "#6C47FF",
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  transcribingLabel: {
    fontSize: 10,
    color: "#9333EA",
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },

  buttonWrapper: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  pulseRing: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(108, 71, 255, 0.2)", // Subtle purple glow
  },
  innerOrb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFF",
    shadowColor: "#FFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    elevation: 2,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  micBtnListening: {
    backgroundColor: PURPLE,   // Keep it purple to look classy
    shadowColor: PURPLE,
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  micBtnTranscribing: {
    backgroundColor: "#9333EA", // purple-600
  },
  micBtnDisabled: {
    backgroundColor: "#A78BFA",
  },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: RED,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    shadowColor: RED,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
});
