import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence, 
  withDelay,
  Easing,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { soundHelper } from '@/utils/SoundHelper';

const { width } = Dimensions.get('window');

interface SuccessBurstProps {
  visible: boolean;
  onComplete: () => void;
  message?: string;
}

export const SuccessBurst: React.FC<SuccessBurstProps> = ({ visible, onComplete, message = "Dose Taken!" }) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Reset
      opacity.value = 0;
      scale.value = 0.8;
      ringScale.value = 0.5;
      ringOpacity.value = 0.8;

      // Play success sound
      soundHelper.playTing();

      // Animation Sequence
      opacity.value = withSequence(
        withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
        withDelay(1500, withTiming(0, { duration: 400 }))
      );

      scale.value = withSequence(
        withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.5)) }),
        withDelay(1400, withTiming(0.9, { duration: 400 }))
      );

      ringScale.value = withTiming(2.5, { duration: 800, easing: Easing.out(Easing.quad) });
      ringOpacity.value = withTiming(0, { duration: 800 });

      const timeout = setTimeout(() => {
        onComplete();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  if (!visible && opacity.value === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Subtle background overlay */}
      <Animated.View style={[styles.overlay, { opacity: interpolate(opacity.value, [0, 1], [0, 0.4], Extrapolate.CLAMP) }]} />
      
      <View style={styles.content}>
        {/* Expanding Burst Ring */}
        <Animated.View style={[styles.ring, ringStyle]} />
        
        {/* Main Card */}
        <Animated.View style={[styles.card, animatedStyle]}>
          <BlurView intensity={80} tint="light" style={styles.blur}>
            <View style={styles.iconCircle}>
              <Feather name="check" size={32} color="#fff" />
            </View>
            <Text style={styles.message}>{message}</Text>
          </BlurView>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#6C47FF',
  },
  card: {
    width: width * 0.5,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  blur: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6C47FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  message: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#1E1B4B',
    textAlign: 'center',
  },
});
