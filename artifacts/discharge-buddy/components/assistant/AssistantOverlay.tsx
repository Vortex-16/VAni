import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { useAssistant } from './AssistantProvider';
import { VoiceOrb } from './VoiceOrb';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAssistantContext } from '@/hooks/assistant/useAssistantContext';
import { useApp } from '@/context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const PURPLE = '#6C47FF';
const PURPLE_LIGHT = '#8B5CF6';

const ONBOARDING_CHIPS = [
  'Guide Me',
  'How To Use App',
  'Features',
  'Caregiver Setup',
  'Medicines',
  'Emergency Tools',
  'Symptom Tracking',
  'Voice Assistant',
  'Journal',
  'Scanner',
  'Settings',
];

const STATE_LABELS: Record<string, string> = {
  initializing: 'Starting up…',
  listening: 'Listening… speak now',
  transcribing: 'Understanding you…',
  processing: 'Got it! Working on it…',
  speaking: 'Buddy is speaking…',
  error: '',
  idle: '',
};

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

  // Hide FAB on chat/scan/emergency/auth screens
  const isChatScreen = activeModule === 'chatbot' || pathname?.includes('/scan');
  const isAuthScreen = !user;
  const isEmergencyOrCpr =
    pathname?.includes('/cpr') ||
    pathname?.includes('/emergency') ||
    pathname?.includes('/smart-sos');
  const shouldHideFab = isChatScreen || isAuthScreen || isEmergencyOrCpr;

  // Draggable FAB
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

  const statusLabel = STATE_LABELS[state] ?? '';

  return (
    <View style={styles.root} pointerEvents="box-none">

      {/* ── Full-screen dimmed backdrop + centered panel ── */}
      {isVisible && (
        <View style={styles.backdrop} pointerEvents="auto">
          {/* Tap backdrop to dismiss */}
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={cancelAssistant}
          />

          {/* Centered card */}
          <View style={[styles.panel, { marginTop: insets.top }]}>

            {/* Gradient header bar */}
            <LinearGradient
              colors={['#4B26C8', PURPLE, PURPLE_LIGHT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.panelHeader}
            >
              <View style={styles.headerLeft}>
                <View style={styles.statusDot} />
                <Text style={styles.headerTitle}>Voice Assistant</Text>
              </View>
              <TouchableOpacity
                onPress={cancelAssistant}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="x" size={22} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Body */}
            <ScrollView
              contentContainerStyle={styles.body}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Large orb — clipped so animation pulses don't escape */}
              <View style={styles.orbWrap}>
                <VoiceOrb
                  state={state}
                  meteringSharedValue={meteringSharedValue}
                  size={140}
                />
              </View>

              {/* State label */}
              {!!statusLabel && (
                <Text style={styles.statusLabel}>{statusLabel}</Text>
              )}
              {state === 'error' && (
                <Text style={styles.errorLabel}>{error || 'Something went wrong'}</Text>
              )}

              {/* What you said */}
              {lastTranscript && state !== 'error' && (
                <View style={styles.transcriptBubble}>
                  <Text style={styles.transcriptLabel}>You said</Text>
                  <Text style={styles.transcriptText} numberOfLines={3}>
                    "{lastTranscript}"
                  </Text>
                </View>
              )}

              {/* Buddy's reply */}
              {lastReply && (state === 'speaking' || state === 'processing') && (
                <View style={styles.replyBubble}>
                  <Text style={styles.replyLabel}>Buddy</Text>
                  <Text style={styles.replyText} numberOfLines={6}>{lastReply}</Text>
                </View>
              )}

              {/* Quick-action chips */}
              {state === 'listening' && (
                <View style={styles.chipsWrapper}>
                  <Text style={styles.chipsLabel}>Quick actions</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}
                  >
                    {ONBOARDING_CHIPS.map((chip, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.chip}
                        onPress={() => processText(chip)}
                      >
                        <Text style={styles.chipText}>{chip}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Send Now */}
              {state === 'listening' && (
                <TouchableOpacity style={styles.sendBtn} onPress={stopAssistant} activeOpacity={0.85}>
                  <LinearGradient
                    colors={[PURPLE, PURPLE_LIGHT]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sendBtnGradient}
                  >
                    <Feather name="send" size={16} color="#FFF" />
                    <Text style={styles.sendBtnText}>Send Now</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* ── Floating Action Button ── */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.fabContainer,
            { bottom: insets.bottom + 100 },
            animatedFabStyle,
          ]}
          pointerEvents="auto"
        >
          <TouchableOpacity
            style={[styles.fab, isActive && styles.fabActive]}
            onPress={isVisible ? cancelAssistant : startAssistant}
            activeOpacity={0.85}
          >
            <Feather
              name={isActive ? 'x' : 'mic'}
              size={26}
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
  },

  /* ── Backdrop ── */
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 8, 40, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  /* ── Panel (centered card) ── */
  panel: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 24,
  },

  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#4ADE80',
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  closeBtn: {
    padding: 4,
  },

  /* ── Body ── */
  body: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },

  /* ── Orb ── */
  orbWrap: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#F5F4FB',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
  },

  /* ── Status ── */
  statusLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  errorLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
  },

  /* ── Transcript bubble ── */
  transcriptBubble: {
    width: '100%',
    backgroundColor: '#F8F7FF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8E4FF',
  },
  transcriptLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: PURPLE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E293B',
    fontStyle: 'italic',
    lineHeight: 22,
  },

  /* ── Reply bubble ── */
  replyBubble: {
    width: '100%',
    backgroundColor: `${PURPLE}0D`,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: `${PURPLE}25`,
  },
  replyLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: PURPLE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  replyText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#1E293B',
    lineHeight: 23,
  },

  /* ── Chips ── */
  chipsWrapper: {
    width: '100%',
    marginTop: 4,
    marginBottom: 4,
  },
  chipsLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chipsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#334155',
  },

  /* ── Send Now ── */
  sendBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  sendBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  sendBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },

  /* ── FAB ── */
  fabContainer: {
    position: 'absolute',
    right: 20,
    alignItems: 'center',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  fabActive: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOpacity: 0.4,
  },
});
