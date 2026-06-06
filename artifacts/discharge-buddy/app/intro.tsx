import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  View,
  Easing,
  TouchableOpacity,
  Text
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MascotBuddy } from '@/components/MascotBuddy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

function FloatingCloud({ scale, top, left, delay }: { scale: number; top: number; left: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 800,
      delay,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -15, duration: 3000 + delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 3000 + delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top,
        left,
        opacity: anim,
        transform: [{ translateY: float }, { scale }],
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
  const mascotY = useRef(new Animated.Value(60)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;
  const mascotFloat = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(height * 0.5)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Mascot drops in
    Animated.parallel([
      Animated.spring(mascotY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.timing(mascotOpacity, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();

    // 2. Bottom Sheet slides up
    Animated.spring(sheetY, {
      toValue: 0,
      tension: 65,
      friction: 11,
      delay: 400,
      useNativeDriver: true,
    }).start();

    // 3. Content fades in
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 500,
      delay: 700,
      useNativeDriver: true
    }).start();

    // 4. Continuous mascot float
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(mascotFloat, { toValue: -20, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(mascotFloat, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    }, 800);
  }, []);

  return (
    <View style={styles.container}>
      {/* Top Background Area */}
      <LinearGradient
        colors={['#C084FC', '#9333EA']}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Decorative Circles */}
      <View style={styles.bgCircleLarge} />
      <View style={styles.bgCircleSmall} />
      
      {/* Clouds */}
      <FloatingCloud scale={0.8} top={height * 0.1} left={-20} delay={0} />
      <FloatingCloud scale={1.2} top={height * 0.25} left={width * 0.65} delay={400} />
      <FloatingCloud scale={0.6} top={height * 0.35} left={width * 0.1} delay={800} />
      <FloatingCloud scale={0.9} top={height * 0.08} left={width * 0.4} delay={200} />

      {/* Mascot Area */}
      <View style={[styles.mascotArea, { paddingTop: insets.top + 40 }]}>
        <Animated.View
          style={[
            styles.mascotWrap,
            {
              opacity: mascotOpacity,
              transform: [
                { translateY: mascotY },
                { translateY: mascotFloat },
              ],
            },
          ]}
        >
          <MascotBuddy size={180} />
        </Animated.View>
      </View>

      {/* Bottom Sheet */}
      <Animated.View 
        style={[
          styles.bottomSheet, 
          { 
            transform: [{ translateY: sheetY }],
            paddingBottom: insets.bottom + 20
          }
        ]}
      >
        <Animated.View style={{ opacity: contentOpacity, width: '100%', alignItems: 'center' }}>
          <View style={styles.handleBar} />
          
          <Text style={styles.title}>Welcome to DischargeBuddy!</Text>
          <Text style={styles.subtitle}>
            Your personal assistant for smarter, simpler care and recovery conversations.
          </Text>

          <TouchableOpacity 
            style={styles.btnContainer} 
            activeOpacity={0.85}
            onPress={() => router.replace('/onboarding')}
          >
            <LinearGradient
              colors={['#A855F7', '#7E22CE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              <Text style={styles.btnText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#9333EA',
  },
  bgCircleLarge: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -100,
    left: -150,
  },
  bgCircleSmall: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: height * 0.4,
    right: -100,
  },
  cloudContainer: {
    width: 100,
    height: 60,
    justifyContent: 'flex-end',
  },
  cloudCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.85)',
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
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    bottom: 0,
    left: 10,
    position: 'absolute',
  },
  mascotArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  mascotWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 20,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    color: '#1E293B',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  btnContainer: {
    width: '100%',
    borderRadius: 100,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  btnGradient: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
});
