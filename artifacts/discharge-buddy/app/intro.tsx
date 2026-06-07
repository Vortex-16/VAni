import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  View,
  Easing,
  TouchableOpacity,
  Text,
  Image,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Background blends perfectly with the uploaded image's background
const BG_COLOR = '#E9DEFE';
const PRIMARY_COLOR = '#6C47FF';

function ParallaxCloud({ 
  scale, top, left, delay, duration 
}: { 
  scale: number; top: number; left: number; delay: number; duration: number 
}) {
  const floatY = useRef(new Animated.Value(0)).current;
  const floatX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slow parallax drifting for the background clouds
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(floatY, { toValue: -15, duration: duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(floatY, { toValue: 0, duration: duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(floatX, { toValue: 20, duration: duration * 1.2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(floatX, { toValue: 0, duration: duration * 1.2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top,
        left,
        transform: [{ translateY: floatY }, { translateX: floatX }, { scale }],
        opacity: 0.7, // softer clouds in background
      }}
    >
      <View style={styles.cloudContainer}>
        <View style={[styles.cloudCircle, styles.cloudCircleLeft]} />
        <View style={[styles.cloudCircle, styles.cloudCircleTop]} />
        <View style={[styles.cloudCircle, styles.cloudCircleRight]} />
        <View style={styles.cloudBase} />
      </View>
    </Animated.View>
  );
}

export default function IntroScreen() {
  const insets = useSafeAreaInsets();
  
  // Parallax layers
  const robotFloat = useRef(new Animated.Value(0)).current;
  const robotEntranceX = useRef(new Animated.Value(width + 150)).current; // Start completely off-screen right
  const robotRotate = useRef(new Animated.Value(25)).current; // Start rotated more
  const robotScale = useRef(new Animated.Value(0.5)).current; // Start small
  const robotOpacity = useRef(new Animated.Value(0)).current;

  const boardY = useRef(new Animated.Value(height * 0.5)).current;
  const boardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Delay slightly to ensure screen transition completes before animation starts
    setTimeout(() => {
      // 1. Enter animations
      Animated.parallel([
        // Robot slides in, scales up massively, and rotates
        Animated.spring(robotEntranceX, { toValue: 0, tension: 40, friction: 6, useNativeDriver: true }),
        Animated.spring(robotRotate, { toValue: 0, tension: 35, friction: 5, useNativeDriver: true }),
        Animated.spring(robotScale, { toValue: 1, tension: 45, friction: 5, useNativeDriver: true }),
        Animated.timing(robotOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        
        // Board enters (pops up from bottom)
        Animated.spring(boardY, { toValue: 0, tension: 50, friction: 8, delay: 150, useNativeDriver: true }),
        Animated.timing(boardOpacity, { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }),
      ]).start();
    }, 150);

    // 2. Subtle continuous Parallax for the robot to maintain depth
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(robotFloat, { toValue: -12, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(robotFloat, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    }, 1000);

  }, []);

  const spin = robotRotate.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={styles.container}>
      {/* BACKGROUND LAYER: Slowest moving parallax elements */}
      <ParallaxCloud scale={0.8} top={height * 0.1} left={-20} delay={0} duration={4000} />
      <ParallaxCloud scale={1.2} top={height * 0.25} left={width * 0.7} delay={500} duration={4500} />
      <ParallaxCloud scale={0.6} top={height * 0.4} left={width * 0.1} delay={1000} duration={3500} />

      {/* CHARACTER LAYER: Medium speed parallax */}
      <View style={[styles.mascotArea, { paddingTop: insets.top }]}>
        <Animated.View
          style={[
            styles.mascotWrap,
            {
              opacity: robotOpacity,
              transform: [
                { translateX: robotEntranceX },
                { translateY: robotFloat },
                { scale: robotScale },
                { rotate: spin },
              ],
            },
          ]}
        >
          <Image 
            source={require('@/assets/images/intro_image.png')} 
            style={styles.robotImage} 
          />
        </Animated.View>
      </View>

      {/* FOREGROUND LAYER: Fastest moving, takes 40% space */}
      <Animated.View 
        style={[
          styles.bottomSheet, 
          { 
            opacity: boardOpacity,
            transform: [{ translateY: boardY }],
            paddingBottom: Math.max(insets.bottom + 20, 30)
          }
        ]}
      >
        <View style={styles.handleBar} />
        
        <View style={styles.textContent}>
          <Text style={styles.title}>Welcome to DischargeBuddy!</Text>
          <Text style={styles.subtitle}>
            Your caring companion for a smooth and stress-free recovery. We are here to support you and your family, every step of the way.
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.btnContainer} 
          activeOpacity={0.85}
          onPress={() => router.replace('/onboarding')}
        >
          <LinearGradient
            colors={['#8A63FF', PRIMARY_COLOR]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            <Text style={styles.btnText}>Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  cloudContainer: {
    width: 100,
    height: 60,
    justifyContent: 'flex-end',
  },
  cloudCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 50,
  },
  cloudCircleLeft: {
    width: 40,
    height: 40,
    bottom: 0,
    left: 10,
  },
  cloudCircleTop: {
    width: 50,
    height: 50,
    bottom: 10,
    left: 25,
  },
  cloudCircleRight: {
    width: 40,
    height: 40,
    bottom: 0,
    right: 15,
  },
  cloudBase: {
    width: 80,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    bottom: 0,
    left: 10,
    position: 'absolute',
  },
  mascotArea: {
    flex: 0.6, // Top 60% of the screen
    alignItems: 'center',
    justifyContent: 'flex-end', 
    zIndex: 100, 
    marginBottom: -40, // Squeeze it over the boundary line but not too deep
  },
  mascotWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 30,
  },
  robotImage: {
    width: width * 1.3, // Slightly reduced so it doesn't smother the text
    height: height * 0.55,
    resizeMode: 'contain',
  },
  bottomSheet: {
    flex: 0.4, // Bottom 40% of the screen
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 32,
    paddingTop: 50, // Massive top padding to push text down away from the overlapping robot
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -15 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 25,
    zIndex: 10,
    justifyContent: 'space-between', 
  },
  handleBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    marginBottom: 10,
    position: 'absolute', // Pin the handle bar to the very top so padding doesn't push it down
    top: 15,
  },
  textContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start', // Align to top of its padded container
  },
  title: {
    fontSize: 26,
    color: '#1E293B',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 5,
  },
  btnContainer: {
    width: '100%',
    borderRadius: 100,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    marginTop: 10,
  },
  btnGradient: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
});
