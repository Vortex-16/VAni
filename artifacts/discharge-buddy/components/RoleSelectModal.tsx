import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { TranslateText as Text } from '@/components/TranslateText';

const PRIMARY      = '#7C3AED';
const PRIMARY_DARK = '#5B21B6';
const WHITE        = '#FFFFFF';
const MUTED        = '#94A3B8';
const SOFT_BG      = '#F5F3FF';
const TEXT_DARK    = '#1E1B4B';

export type AppRole = 'patient' | 'family' | 'caregiver';

const ROLE_OPTIONS: { role: AppRole; icon: keyof typeof Feather.glyphMap; label: string; sub: string }[] = [
  { role: 'patient',   icon: 'user',  label: 'Patient',       sub: 'Track your own recovery & medication' },
  { role: 'family',    icon: 'heart', label: 'Family Member', sub: 'Monitor a loved one with their code' },
  { role: 'caregiver', icon: 'users', label: 'Caregiver',     sub: 'Manage patients you care for' },
];

interface Props {
  visible: boolean;
  email?: string;
  /** Role pre-highlighted by the backend domain heuristic. */
  suggestedRole?: AppRole;
  onConfirm: (role: AppRole) => void;
  onCancel: () => void;
}

/**
 * Animated, on-brand modal shown after a first-time Google sign-in so the new
 * user explicitly chooses their role before the account is created.
 */
export function RoleSelectModal({ visible, email, suggestedRole, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<AppRole>(suggestedRole ?? 'patient');

  // Reset selection to the suggestion each time the modal opens.
  useEffect(() => {
    if (visible) setSelected(suggestedRole ?? 'patient');
  }, [visible, suggestedRole]);

  const pick = (role: AppRole) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(role);
  };

  const confirm = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(selected);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill}>
        <Animated.View entering={FadeIn.duration(180)} style={styles.outer}>
          <Animated.View entering={SlideInDown.springify().damping(18)} style={styles.card}>
            {/* Header */}
            <View style={styles.iconBadge}>
              <Feather name="user-check" size={22} color={WHITE} />
            </View>
            <Text style={styles.title}>How will you use DischargeBuddy?</Text>
            <Text style={styles.sub}>
              {email ? `Signing in as ${email}` : 'Choose the role that fits you'}
            </Text>

            {/* Options */}
            <View style={styles.optList}>
              {ROLE_OPTIONS.map((opt) => {
                const active = selected === opt.role;
                const isSuggested = suggestedRole === opt.role;
                return (
                  <TouchableOpacity
                    key={opt.role}
                    activeOpacity={0.85}
                    onPress={() => pick(opt.role)}
                    style={[styles.opt, active && styles.optActive]}
                  >
                    <View style={[styles.optIcon, { backgroundColor: active ? PRIMARY : SOFT_BG }]}>
                      <Feather name={opt.icon} size={20} color={active ? WHITE : PRIMARY} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.optLabelRow}>
                        <Text style={[styles.optLabel, active && { color: PRIMARY }]}>{opt.label}</Text>
                        {isSuggested && (
                          <View style={styles.suggestBadge}>
                            <Feather name="zap" size={9} color={PRIMARY_DARK} />
                            <Text style={styles.suggestText}>Suggested</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.optSub}>{opt.sub}</Text>
                    </View>
                    <Feather
                      name={active ? 'check-circle' : 'circle'}
                      size={20}
                      color={active ? PRIMARY : '#CBD5E1'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Confirm */}
            <TouchableOpacity onPress={confirm} activeOpacity={0.85} style={styles.confirmBtn}>
              <LinearGradient
                colors={[PRIMARY, PRIMARY_DARK]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.confirmGrad}
              >
                <Text style={styles.confirmText}>CONTINUE</Text>
                <Feather name="arrow-right" size={18} color={WHITE} />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, justifyContent: 'flex-end' },
  card: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  iconBadge: {
    alignSelf: 'center',
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  title: { fontSize: 20, fontFamily: 'Inter_800ExtraBold', color: TEXT_DARK, textAlign: 'center', letterSpacing: -0.3 },
  sub:   { fontSize: 13, color: MUTED, textAlign: 'center', marginTop: 4, marginBottom: 18 },

  optList: { gap: 10 },
  opt: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 16, padding: 14,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  optActive: { borderColor: PRIMARY, backgroundColor: SOFT_BG },
  optIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optLabel: { fontSize: 15, fontFamily: 'Inter_700Bold', color: TEXT_DARK },
  optSub:   { fontSize: 12, color: MUTED, marginTop: 2 },

  suggestBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#EDE9FE', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  suggestText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: PRIMARY_DARK, letterSpacing: 0.3 },

  confirmBtn: {
    borderRadius: 14, marginTop: 20,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 7,
  },
  confirmGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 16 },
  confirmText: { color: WHITE, fontSize: 15, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },

  cancelBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  cancelText: { fontSize: 14, color: MUTED, fontFamily: 'Inter_600SemiBold' },
});
