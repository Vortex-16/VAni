
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Share, StyleSheet, TouchableOpacity, View, ActivityIndicator, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';
import { TranslateText as Text } from '@/components/TranslateText';
import { useApp } from '@/context/AppContext';

const PRIMARY = '#7C3AED';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const SOFT_BG = '#F5F3FF';
const WHITE = '#FFFFFF';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ShareLinkQRModal({ visible, onClose }: Props) {
  const { api } = useApp();
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let active = true;

    const loadCode = async () => {
      setLoading(true);
      try {
        const code = await api.getMyLinkCode();
        if (active) setLinkCode(code);
      } catch (err: any) {
        console.error('Failed to load link code', err);
        if (active) {
          Alert.alert('Unable to load QR code', 'Please try again later.');
          onClose();
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCode();
    return () => { active = false; };
  }, [visible, api, onClose]);

  const handleShare = async () => {
    if (!linkCode) return;
    const message = `Scan this Discharge Buddy QR code or use code ${linkCode} to link to my care.`;

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(linkCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {
        Alert.alert('Copy failed', 'Unable to copy the code to clipboard.');
      }
      return;
    }

    try {
      await Share.share({ title: 'Discharge Buddy Link Code', message });
    } catch {
      Alert.alert('Share', message);
    }
  };

  const handleCopy = async () => {
    if (!linkCode) return;

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(linkCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {
        Alert.alert('Copy failed', 'Unable to copy your code.');
      }
      return;
    }

    try {
      await Share.share({ title: 'Discharge Buddy Link Code', message: linkCode });
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      Alert.alert('Copy', linkCode);
    }
  };

  const handleReset = async () => {
    if (!linkCode) return;
    Alert.alert(
      'Reset your code?',
      'Your current code will stop working. Anyone already linked will need the new code.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const newCode = await api.resetMyLinkCode();
              setLinkCode(newCode);
            } catch (err: any) {
              console.error('Failed to reset link code', err);
              Alert.alert('Reset failed', 'Please try again later.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const qrValue = linkCode ? JSON.stringify({ type: 'link', linkCode }) : '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Share Link QR</Text>
            <TouchableOpacity onPress={onClose} style={styles.close}>
              <Feather name="x" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={PRIMARY} size="large" />
            </View>
          ) : (
            <>
              <View style={styles.note}>
                <Feather name="info" size={13} color={PRIMARY} />
                <Text style={styles.noteText}>
                  Family or caregivers can scan this QR from within the app to link to your patient profile.
                </Text>
              </View>

              <View style={styles.qrBox}>
                {linkCode ? (
                  <QRCode value={qrValue} size={220} color={TEXT_DARK} backgroundColor={WHITE} />
                ) : (
                  <Text style={styles.noteText}>Unable to generate QR. Please try again.</Text>
                )}
              </View>

              <View style={styles.codeCard}>
                <Text style={styles.cardLabel}>Your care code</Text>
                <Text style={styles.code}>{linkCode ?? '—'}</Text>
              </View>

              <TouchableOpacity style={styles.actionBtn} onPress={handleCopy}>
                <Feather name={copied ? 'check' : 'copy'} size={16} color={WHITE} />
                <Text style={styles.actionText}>{copied ? 'Copied' : 'Copy code'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={handleShare}>
                <Feather name="share-2" size={16} color={PRIMARY} />
                <Text style={[styles.actionText, { color: PRIMARY }]}>Share link</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.resetBtn]} onPress={handleReset}>
                <Feather name="refresh-cw" size={16} color={WHITE} />
                <Text style={styles.actionText}>Reset code</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 28 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, color: TEXT_DARK, fontFamily: 'Inter_700Bold' },
  close: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: SOFT_BG, borderRadius: 14, padding: 12, marginBottom: 18 },
  noteText: { flex: 1, fontSize: 13, color: '#4C1D95', lineHeight: 18 },
  centered: { alignItems: 'center', justifyContent: 'center', minHeight: 180 },
  qrBox: { alignItems: 'center', justifyContent: 'center', backgroundColor: WHITE, borderRadius: 24, padding: 18, marginBottom: 18, borderWidth: 1, borderColor: '#E2E8F0' },
  codeCard: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, marginBottom: 18 },
  cardLabel: { fontSize: 12, color: TEXT_MUTED, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  code: { fontSize: 22, color: TEXT_DARK, fontFamily: 'Inter_800ExtraBold', letterSpacing: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 14, marginBottom: 12 },
  secondaryBtn: { backgroundColor: '#EFF6FF' },
  resetBtn: { backgroundColor: '#4B26C8' },
  actionText: { color: WHITE, fontSize: 14, fontFamily: 'Inter_700Bold' },
});
