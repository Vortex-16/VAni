import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useAssistant } from './AssistantProvider';
import { VoiceOrb } from './VoiceOrb';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAssistantContext } from '@/hooks/assistant/useAssistantContext';

const { width } = Dimensions.get('window');

const PURPLE = '#6C47FF';

/**
 * Global Assistant Overlay that sits on top of the entire application.
 * 
 * It renders TWO layers:
 *  1. A persistent FAB (Floating Action Button) in the bottom-right corner — ALWAYS visible,
 *     EXCEPT on the /chat screen where the chatbot has its own mic UI.
 *  2. A full panel that appears when the assistant is active.
 */
export function AssistantOverlay() {
  const { 
    state, 
    isVisible, 
    meteringSharedValue, 
    lastTranscript, 
    error,
    startAssistant,
    cancelAssistant,
    stopAssistant,
  } = useAssistant();

  const { activeModule, pathname } = useAssistantContext();
  const insets = useSafeAreaInsets();
  const isActive = isVisible && state !== 'idle';

  // Hide the FAB completely when on chat/scan screens that have their own mic UI
  const isChatScreen = activeModule === 'chatbot' || pathname?.includes('/scan');

  // Drag logic
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = offsetX.value + e.translationX;
      translateY.value = offsetY.value + e.translationY;
    })
    .onEnd(() => {
      offsetX.value = translateX.value;
      offsetY.value = translateY.value;
    });

  const animatedFabStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  if (isChatScreen && !isVisible) return null;

  return (
    // box-none: passes touches through to the children but not the container itself
    <View style={styles.root} pointerEvents="box-none">

      {/* ── 2. Active Panel (slide up from bottom) ── */}
      {isVisible && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="auto"
        >
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
        </Animated.View>
      )}

      {isVisible && (
        <Animated.View
          entering={SlideInDown.springify().damping(18)}
          exiting={SlideOutDown}
          style={[styles.panel, { bottom: insets.bottom + 100 }]}
          pointerEvents="auto"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.statusDot} />
              <Text style={styles.title}>Voice Assistant</Text>
            </View>
            <TouchableOpacity onPress={cancelAssistant} style={styles.closeButton}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Orb */}
          <View style={styles.orbContainer}>
            <VoiceOrb state={state} meteringSharedValue={meteringSharedValue} size={130} />
          </View>

          {/* Status text */}
          <View style={styles.statusContainer}>
            {state === 'initializing' && <Text style={styles.statusText}>Starting up...</Text>}
            {state === 'listening'    && <Text style={styles.statusText}>Listening... (stops automatically)</Text>}
            {state === 'transcribing' && <Text style={styles.statusText}>Understanding you...</Text>}
            {state === 'processing'   && <Text style={styles.statusText}>Got it! Working on it...</Text>}
            {state === 'error'        && <Text style={styles.errorText}>{error || "Something went wrong"}</Text>}

            {lastTranscript && state !== 'error' && (
              <Text style={styles.transcriptText}>"{lastTranscript}"</Text>
            )}
          </View>

          {/* Manual stop button — tap instead of waiting */}
          {state === 'listening' && (
            <TouchableOpacity style={styles.stopButton} onPress={stopAssistant}>
              <Feather name="send" size={16} color="#FFF" />
              <Text style={styles.stopButtonText}>Send Now</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* ── 1. Floating Action Button (FAB) — ALWAYS visible ── */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[styles.fabContainer, { bottom: insets.bottom + 24 }, animatedFabStyle]}
          pointerEvents="auto"
        >
          <TouchableOpacity
            style={[styles.fab, isActive && styles.fabActive]}
            onPress={isVisible ? cancelAssistant : startAssistant}
            activeOpacity={0.85}
          >
            <Feather
              name={isActive ? 'x' : 'mic'}
              size={22}
              color="#FFF"
            />
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  // FAB
  fabContainer: {
    position: 'absolute',
    right: 20,
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabActive: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  // Active panel
  panel: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  orbContainer: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  statusContainer: {
    alignItems: 'center',
    minHeight: 44,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#EF4444',
    textAlign: 'center',
  },
  transcriptText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PURPLE,
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignSelf: 'center',
    marginTop: 16,
  },
  stopButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  }
});
