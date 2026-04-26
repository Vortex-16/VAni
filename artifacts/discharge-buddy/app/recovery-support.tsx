import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { BreathingOrb } from '../components/BreathingOrb';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const PHASES = [
  { text: "Breathe In", duration: 4000 },
  { text: "Hold", duration: 2000 },
  { text: "Breathe Out", duration: 6000 },
];

export default function RecoverySupportScreen() {
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes

  useEffect(() => {
    let timer: any;
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    return () => clearInterval(timer);
  }, [isActive, timeLeft]);

  useEffect(() => {
    let phaseTimer: any;
    if (isActive) {
      const currentPhase = PHASES[phaseIndex];
      phaseTimer = setTimeout(() => {
        setPhaseIndex((phaseIndex + 1) % PHASES.length);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, currentPhase.duration);
    }
    return () => clearTimeout(phaseTimer);
  }, [isActive, phaseIndex]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Background soft gradients */}
      <View style={[styles.bgGradient, { top: -100, left: -100, backgroundColor: 'rgba(108, 71, 255, 0.05)' }]} />
      <View style={[styles.bgGradient, { bottom: -100, right: -100, backgroundColor: 'rgba(10, 165, 233, 0.05)' }]} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={28} color="#1E1B4B" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Recovery Support</Text>
          <Text style={styles.subtitle}>2-min Guided Breathing</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          <Text style={styles.phaseText}>{isActive ? PHASES[phaseIndex].text : "Ready to reset?"}</Text>
        </View>

        <BreathingOrb />

        <View style={styles.footer}>
          {!isActive ? (
            <TouchableOpacity 
              style={styles.startBtn} 
              onPress={() => {
                setIsActive(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            >
              <Text style={styles.startBtnText}>Start Session</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.pauseBtn} 
              onPress={() => setIsActive(false)}
            >
              <Feather name="pause" size={24} color="#6C47FF" />
              <Text style={styles.pauseBtnText}>Pause</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.endBtn} 
            onPress={() => router.back()}
          >
            <Text style={styles.endBtnText}>End Session</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Neumorphic decoration like the TENS device */}
      <View style={styles.decorationContainer}>
        <View style={styles.neoDotActive} />
        <View style={styles.neoDot} />
        <View style={styles.neoDot} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  bgGradient: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#1E1B4B',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 48,
    fontFamily: 'Inter_700Bold',
    color: '#1E1B4B',
    letterSpacing: 2,
  },
  phaseText: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: '#6C47FF',
    marginTop: 8,
  },
  footer: {
    width: '100%',
    paddingHorizontal: 40,
    gap: 16,
  },
  startBtn: {
    backgroundColor: '#6C47FF',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  pauseBtnText: {
    color: '#6C47FF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  endBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  endBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  decorationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  neoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  neoDotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6C47FF',
  }
});
