import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const ORB_SIZE = Math.min(width * 0.6, 250);

interface BreathingOrbProps {
  duration?: number; // Total duration in seconds
  inhaleTime?: number;
  holdTime?: number;
  exhaleTime?: number;
  onUpdate?: (phase: string) => void;
}

export const BreathingOrb = ({ 
  inhaleTime = 4000, 
  holdTime = 2000, 
  exhaleTime = 6000,
  onUpdate 
}: BreathingOrbProps) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);
  const glow = useSharedValue(0);

  useEffect(() => {
    const totalCycle = inhaleTime + holdTime + exhaleTime;
    
    scale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: inhaleTime, easing: Easing.bezier(0.42, 0, 0.58, 1) }), // Inhale
        withTiming(1.4, { duration: holdTime }), // Hold
        withTiming(1, { duration: exhaleTime, easing: Easing.bezier(0.42, 0, 0.58, 1) }) // Exhale
      ),
      -1,
      false
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: inhaleTime }),
        withTiming(1, { duration: holdTime }),
        withTiming(0.6, { duration: exhaleTime })
      ),
      -1,
      false
    );

    glow.value = withRepeat(
      withTiming(1, { duration: inhaleTime + holdTime, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
      shadowOpacity: interpolate(glow.value, [0, 1], [0.1, 0.5]),
      shadowRadius: interpolate(glow.value, [0, 1], [10, 30]),
    };
  });

  return (
    <View style={styles.container}>
      {/* Outer Glow Ring */}
      <Animated.View style={[styles.ring, { borderColor: 'rgba(108, 71, 255, 0.1)' }]} />
      <Animated.View style={[styles.ring, { borderColor: 'rgba(108, 71, 255, 0.05)', width: ORB_SIZE + 40, height: ORB_SIZE + 40 }]} />
      
      {/* The Orb */}
      <Animated.View style={[styles.orb, animatedStyle]}>
        <View style={styles.innerOrb}>
          <View style={styles.centerDot} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: ORB_SIZE + 100,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: '#6C47FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  innerOrb: {
    width: ORB_SIZE * 0.8,
    height: ORB_SIZE * 0.8,
    borderRadius: (ORB_SIZE * 0.8) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  ring: {
    position: 'absolute',
    width: ORB_SIZE + 80,
    height: ORB_SIZE + 80,
    borderRadius: (ORB_SIZE + 80) / 2,
    borderWidth: 1,
  }
});
