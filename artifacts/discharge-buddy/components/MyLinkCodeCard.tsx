import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Share, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { TranslateText as Text } from '@/components/TranslateText';
import { useApp } from '@/context/AppContext';

const PRIMARY      = '#7C3AED';
const PRIMARY_DARK = '#5B21B6';
const WHITE        = '#FFFFFF';

/**
 * Patient-facing card showing their shareable link code. Family/caregivers enter
 * this code to connect to the patient's dashboard. Hidden if the account has no
 * patient profile (e.g. a family user).
 */
export function MyLinkCodeCard() {
  const { api } = useApp();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    api.getMyLinkCode()
      .then((c) => { if (active) setCode(c); })
      .catch(() => { if (active) setCode(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const share = async () => {
    if (!code) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const message = `Connect to my DischargeBuddy care with this code: ${code}`;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch { /* ignore */ }
    } else {
      try { await Share.share({ message }); } catch { /* user dismissed */ }
    }
  };

  const reset = () => {
    const doReset = async () => {
      setLoading(true);
      try {
        const c = await api.resetMyLinkCode();
        setCode(c);
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    if (Platform.OS === 'web') {
      doReset();
    } else {
      Alert.alert(
        'Reset your code?',
        'Your current code will stop working. Anyone you want connected will need the new code.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reset', style: 'destructive', onPress: doReset },
        ],
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.card, styles.centered]}>
        <ActivityIndicator color={PRIMARY} />
      </View>
    );
  }

  if (!code) return null; // No patient profile on this account.

  return (
    <LinearGradient
      colors={[PRIMARY, PRIMARY_DARK]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <Feather name="share-2" size={16} color={WHITE} />
        <Text style={styles.title}>My Care Code</Text>
      </View>
      <Text style={styles.subtitle}>Share this code so family or a caregiver can follow your recovery.</Text>

      <View style={styles.codeRow}>
        <Text style={styles.code} selectable>{code}</Text>
        <TouchableOpacity onPress={share} style={styles.copyBtn} activeOpacity={0.85}>
          <Feather name={copied ? 'check' : (Platform.OS === 'web' ? 'copy' : 'share')} size={16} color={PRIMARY} />
          <Text style={styles.copyText}>{copied ? 'Copied' : (Platform.OS === 'web' ? 'Copy' : 'Share')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={reset} style={styles.resetBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="refresh-cw" size={12} color="rgba(255,255,255,0.85)" />
        <Text style={styles.resetText}>Reset code</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 5,
  },
  centered: { alignItems: 'center', justifyContent: 'center', minHeight: 120, backgroundColor: '#F5F3FF' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: WHITE, fontSize: 15, fontFamily: 'Inter_700Bold' },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4, lineHeight: 17 },
  codeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginTop: 14,
  },
  code: { color: WHITE, fontSize: 22, fontFamily: 'Inter_800ExtraBold', letterSpacing: 2 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: WHITE, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  copyText: { color: PRIMARY, fontSize: 13, fontFamily: 'Inter_700Bold' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 12 },
  resetText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});
