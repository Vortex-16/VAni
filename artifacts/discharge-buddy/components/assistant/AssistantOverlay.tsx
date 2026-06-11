import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { useAssistant } from './AssistantProvider';
import { VoiceOrb } from './VoiceOrb';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAssistantContext } from '@/hooks/assistant/useAssistantContext';
import { useApp } from '@/context/AppContext';

const { width } = Dimensions.get('window');

const PURPLE = '#6C47FF';

const ONBOARDING_CHIPS = [
  "Guide Me", "How To Use App", "Features", "Caregiver Setup", 
  "Medicines", "Emergency Tools", "Symptom Tracking", "Voice Assistant", 
  "Journal", "Scanner", "Settings"
];

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
    lastReply,
    error,
    startAssistant,
    cancelAssistant,
    stopAssistant,
    processText,
  } = useAssistant();

  const { activeModule, pathname } = useAssistantContext();
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  const isActive = isVisible && state !== 'idle';

  // Hide the FAB completely when on chat/scan screens or onboarding/auth screens
  const isChatScreen = activeModule === 'chatbot' || pathname?.includes('/scan');
  const isAuthScreen = !user;
  const shouldHideFab = isChatScreen || isAuthScreen;

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

  if (shouldHideFab && !isVisible) return null;

  return (
    // box-none: passes touches through to the children but not the container itself
    <View style={styles.root} pointerEvents="box-none">

      {/* ── 2. Active Panel (slide up from bottom) ── */}
      

      {isVisible && (
        <View
            style={styles.panelCentered}
            pointerEvents="auto"
          >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.statusDot} />
              <Text style={styles.title}>Voice Assistant</Text>
            </View>
            <TouchableOpacity onPress={cancelAssistant} style={styles.closeButton}>
              <Feather name="x" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Orb */}
          <View style={styles.orbContainer}>
            {/** Compute dynamic orb size based on activity */}
            <VoiceOrb
                  state={state}
                  meteringSharedValue={meteringSharedValue}
                  size={120}
                />
          </View>

          {/* Status text */}
          <View style={styles.statusContainer}>
            {state === 'initializing' && <Text style={styles.statusText}>Starting up...</Text>}
            {state === 'listening'    && <Text style={styles.statusText}>Listening... (stops automatically)</Text>}
            {state === 'transcribing' && <Text style={styles.statusText}>Understanding you...</Text>}
            {state === 'processing'   && <Text style={styles.statusText}>Got it! Working on it...</Text>}
            {state === 'speaking'     && <Text style={styles.statusText}>Buddy is speaking...</Text>}
            {state === 'error'        && <Text style={styles.errorText}>{error || "Something went wrong"}</Text>}

            {lastTranscript && state !== 'error' && (
              <Text style={styles.transcriptText}>"{lastTranscript}"</Text>
            )}

            {lastReply && (state === 'speaking' || state === 'processing') && (
              <Text style={styles.replyText}>{lastReply}</Text>
            )}
          </View>

          {/* Suggested Actions / Onboarding Chips */}
          {state === 'listening' && (
            <View style={styles.chipsWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {ONBOARDING_CHIPS.map((chip, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.chipBtn} 
                    onPress={() => processText(chip)}
                  >
                    <Text style={styles.chipBtnText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Manual stop button — tap instead of waiting */}
          {state === 'listening' && (
            <TouchableOpacity style={styles.stopButton} onPress={stopAssistant}>
              <Feather name="send" size={16} color="#FFF" />
              <Text style={styles.stopButtonText}>Send Now</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── 1. Floating Action Button (FAB) — ALWAYS visible ── */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[styles.fabContainer, { bottom: insets.bottom + 100 }, animatedFabStyle]}
          pointerEvents="auto"
        >
          <TouchableOpacity
            style={[styles.fab, isActive && styles.fabActive]}
            onPress={isVisible ? cancelAssistant : startAssistant}
            activeOpacity={0.85}
          >
            <Feather
              name={isActive ? 'x' : 'mic'}
              size={24}
              color={isActive ? '#FFF' : PURPLE}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  // FAB
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 100, // Safe default, overrides the inline style below if needed
    alignItems: 'center',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  fabActive: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  // Active panel
  panelCentered: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 32,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    marginBottom: 12,
    // Ensure it appears above other elements
    zIndex: 10,
    elevation: 10,
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
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  replyText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
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
  },
  chipsWrapper: {
    marginTop: 16,
    width: '100%',
  },
  chipsScroll: {
    paddingHorizontal: 8,
    gap: 8,
  },
  chipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#334155',
  }
});
