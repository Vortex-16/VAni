import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  useSharedValue,
  SharedValue,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AssistantState } from './AssistantProvider';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

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

  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation]);

  const animatedStyle1 = useAnimatedStyle(() => {
    let scale = breathingScale.value;
    if (state === 'listening' || state === 'transcribing') {
      const db = Math.max(-60, Math.min(0, meteringSharedValue.value));
      const normalized = (db + 60) / 60;
      scale = 1 + (normalized * 0.2);
    }
    return {
      transform: [
        { scale },
        { rotate: `${rotation.value}deg` }
      ],
    };
  });

  const animatedStyle2 = useAnimatedStyle(() => {
    let scale = breathingScale.value;
    if (state === 'listening' || state === 'transcribing') {
      const db = Math.max(-60, Math.min(0, meteringSharedValue.value));
      const normalized = (db + 60) / 60;
      scale = 1 + (normalized * 0.2);
    }
    return {
      transform: [
        { scale: scale * 0.95 },
        { rotate: `-${rotation.value * 1.5}deg` }
      ],
    };
  });

  const getWaveColors = () => {
    switch (state) {
      case 'listening': 
      case 'transcribing': 
        return ['rgba(255,255,255,0)', 'rgba(167,139,250,0.8)', 'rgba(108,71,255,0.9)', 'rgba(255,255,255,0)'] as const;
      case 'processing': 
        return ['rgba(255,255,255,0)', 'rgba(59,130,246,0.8)', 'rgba(45,212,191,0.9)', 'rgba(255,255,255,0)'] as const;
      case 'speaking': 
        return ['rgba(255,255,255,0)', 'rgba(16,185,129,0.8)', 'rgba(59,130,246,0.9)', 'rgba(255,255,255,0)'] as const;
      case 'error': 
        return ['rgba(255,255,255,0)', 'rgba(239,68,68,0.8)', 'rgba(245,158,11,0.9)', 'rgba(255,255,255,0)'] as const;
      default: 
        return ['rgba(255,255,255,0)', 'rgba(129,140,248,0.5)', 'rgba(167,139,250,0.6)', 'rgba(255,255,255,0)'] as const;
    }
  };

  const waveColors = getWaveColors();
  // Pearl base colors
  const baseColors = ['#FFFFFF', '#E2E8F0'] as const;

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="auto">
      {/* Base Pearl Orb */}
      <AnimatedGradient
        colors={baseColors}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.8, y: 0.9 }}
        style={[
          styles.layer, 
          styles.pearlShadow,
          { 
            width: size, height: size, borderRadius: size / 2,
            opacity: 0.95
          },
          animatedStyle1
        ]} 
      />
      {/* Inner Fluid Wave */}
      <AnimatedGradient
        colors={waveColors}
        locations={[0, 0.4, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.layer, 
          { 
            width: size * 0.95, height: size * 0.95, borderRadius: (size * 0.95) / 2,
          },
          animatedStyle2
        ]} 
      />
      {/* Glossy Highlight Overlay */}
      <AnimatedGradient
        colors={['rgba(255,255,255,0.8)', 'transparent', 'rgba(255,255,255,0.1)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[
          styles.layer,
          {
            width: size, height: size, borderRadius: size / 2,
            opacity: 0.8
          },
          animatedStyle1
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
  layer: {
    position: 'absolute',
  },
  pearlShadow: {
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  }
});
