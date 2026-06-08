import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  useSharedValue,
  SharedValue
} from 'react-native-reanimated';
import { AssistantState } from './AssistantProvider';

interface VoiceOrbProps {
  state: AssistantState;
  meteringSharedValue: SharedValue<number>;
  size?: number;
}

export function VoiceOrb({ state, meteringSharedValue, size = 120 }: VoiceOrbProps) {
  // Base scale for idle breathing
  const breathingScale = useSharedValue(1);

  // Set up idle breathing animation
  React.useEffect(() => {
    if (state === 'idle' || state === 'initializing') {
      breathingScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1500 }),
          withTiming(0.95, { duration: 1500 })
        ),
        -1, // infinite
        true // reverse
      );
    } else if (state === 'processing') {
      breathingScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 400 }),
          withTiming(0.85, { duration: 400 })
        ),
        -1,
        true
      );
    } else if (state === 'speaking') {
      // Gentle, steady pulse while Buddy talks back.
      breathingScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 550 }),
          withTiming(0.96, { duration: 550 })
        ),
        -1,
        true
      );
    } else {
      breathingScale.value = withTiming(1, { duration: 300 });
    }
  }, [state, breathingScale]);

  const animatedStyle = useAnimatedStyle(() => {
    let scale = breathingScale.value;
    
    // If listening, map metering (-160 to 0) to scale (1 to 1.5)
    if (state === 'listening' || state === 'transcribing') {
      const db = Math.max(-60, Math.min(0, meteringSharedValue.value));
      const normalized = (db + 60) / 60; // 0 to 1
      scale = 1 + (normalized * 0.5);
    }

    return {
      transform: [{ scale }],
    };
  });

  const getOrbColors = () => {
    switch (state) {
      case 'listening': return ['rgba(147, 51, 234, 0.4)', 'rgba(108, 71, 255, 1)'];
      case 'transcribing': return ['rgba(147, 51, 234, 0.4)', 'rgba(108, 71, 255, 1)'];
      case 'processing': return ['rgba(59, 130, 246, 0.4)', 'rgba(37, 99, 235, 1)'];
      case 'speaking': return ['rgba(16, 185, 129, 0.4)', 'rgba(5, 150, 105, 1)'];
      case 'error': return ['rgba(239, 68, 68, 0.4)', 'rgba(220, 38, 38, 1)'];
      default: return ['rgba(203, 213, 225, 0.4)', 'rgba(148, 163, 184, 1)'];
    }
  };

  const [outerColor, innerColor] = getOrbColors();

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View 
        style={[
          styles.outerGlow, 
          { 
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: outerColor 
          },
          animatedStyle
        ]} 
      />
      <View 
        style={[
          styles.innerOrb, 
          { 
            width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2,
            backgroundColor: innerColor 
          }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlow: {
    position: 'absolute',
    opacity: 0.8,
  },
  innerOrb: {
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  }
});
