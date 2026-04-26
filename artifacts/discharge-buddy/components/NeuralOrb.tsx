import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedProps,
  withRepeat, 
  withTiming, 
  withSequence,
  interpolate,
  Extrapolate,
  withSpring,
  withDelay
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { 
  Circle, 
  Defs, 
  RadialGradient, 
  Stop, 
  G, 
  Rect,
  Path
} from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const { width } = Dimensions.get('window');
const ORB_SIZE = 80;

interface NeuralOrbProps {
  isSpeaking?: boolean;
  isProcessing?: boolean;
  isAssistant?: boolean;
}

export function NeuralOrb({ isSpeaking = false, isProcessing = false, isAssistant = false }: NeuralOrbProps) {
  const pulse = useSharedValue(1);
  const rotation = useSharedValue(0);
  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);

  useEffect(() => {
    if (isSpeaking || isProcessing) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );

      rotation.value = withRepeat(
        withTiming(360, { duration: 3000 }),
        -1,
        false
      );

      wave1.value = withRepeat(
        withTiming(1, { duration: 2000 }),
        -1,
        false
      );
      
      wave2.value = withDelay(1000, withRepeat(
        withTiming(1, { duration: 2000 }),
        -1,
        false
      ));
    } else {
      pulse.value = withTiming(1);
      rotation.value = withTiming(0);
      wave1.value = withTiming(0);
      wave2.value = withTiming(0);
    }
  }, [isSpeaking, isProcessing]);

  const eyeProps = useAnimatedProps(() => {
    return {
      height: withTiming(isSpeaking ? 12 : 20, { duration: 200 }),
    };
  });

  const mouthProps = useAnimatedProps(() => {
    return {
      opacity: isSpeaking ? withRepeat(
        withSequence(
          withTiming(1, { duration: 150 }),
          withTiming(0.4, { duration: 150 })
        ),
        -1,
        true
      ) : 0
    };
  });

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    shadowOpacity: interpolate(pulse.value, [1, 1.2], [0.3, 0.6]),
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const wave1Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(wave1.value, [0, 1], [1, 2.5]) }],
    opacity: interpolate(wave1.value, [0, 0.5, 1], [0.6, 0.3, 0]),
  }));

  const wave2Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(wave2.value, [0, 1], [1, 2.5]) }],
    opacity: interpolate(wave2.value, [0, 0.5, 1], [0.6, 0.3, 0]),
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.wave, wave1Style]} />
      <Animated.View style={[styles.wave, wave2Style]} />

      <Animated.View style={[styles.ringContainer, ringStyle]}>
        <LinearGradient
          colors={['#4F46E5', '#9333EA', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ring}
        />
      </Animated.View>

      <Animated.View style={[styles.orb, orbStyle]}>
        <Svg height="100%" width="100%" viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id="coreGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <Stop offset="0%" stopColor="#A855F7" />
              <Stop offset="100%" stopColor="#6366F1" />
            </RadialGradient>
          </Defs>
          <Circle cx="100" cy="100" r="40" fill="url(#coreGradient)" />

          {isAssistant && (
            <G transform="translate(85, 90)">
              <AnimatedRect x="0" y="0" width="8" height="20" rx="4" fill="white" animatedProps={eyeProps} />
              <AnimatedRect x="22" y="0" width="8" height="20" rx="4" fill="white" animatedProps={eyeProps} />
            </G>
          )}

          {isAssistant && (
            <AnimatedPath
              d="M 90 125 Q 100 135 110 125"
              stroke="white"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              animatedProps={mouthProps}
            />
          )}
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: ORB_SIZE * 2.5,
    height: ORB_SIZE * 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: '#6366F1',
    overflow: 'hidden',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 15,
    elevation: 10,
  },
  ringContainer: {
    position: 'absolute',
    width: ORB_SIZE + 20,
    height: ORB_SIZE + 20,
    borderRadius: (ORB_SIZE + 20) / 2,
    padding: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ring: {
    flex: 1,
    borderRadius: (ORB_SIZE + 16) / 2,
    opacity: 0.4,
  },
  wave: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 2,
    borderColor: '#A855F7',
  },
});
