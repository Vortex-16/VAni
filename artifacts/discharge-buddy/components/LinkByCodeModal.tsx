import React, { useState } from 'react';
import { Modal, View, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { DotLoader } from './DotLoader';
import { Feather } from '@expo/vector-icons';
import { TranslateText as Text } from '@/components/TranslateText';
import { useApp } from '@/context/AppContext';

const PRIMARY   = '#7C3AED';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED= '#64748B';
const SOFT_BG   = '#F5F3FF';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called after a successful link (e.g. to refresh the dashboard list). */
  onLinked?: () => void | Promise<void>;
}

/** Focused modal for a family/caregiver to link a patient by their care code. */
export function LinkByCodeModal({ visible, onClose, onLinked }: Props) {
  const { linkPatientByCode } = useApp();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!code.trim()) { Alert.alert('Required', 'Please enter a patient code.'); return; }
    setLoading(true);
    try {
      await linkPatientByCode(code.trim());
      await onLinked?.();
      setCode('');
      onClose();
    } catch (e: any) {
      const msg = String(e?.message || '');
      Alert.alert(
        'Invalid Code',
        msg.includes('INVALID_CODE')
          ? "We couldn't find a patient with that code. Please double-check and try again."
          : (msg || 'Failed to link patient.'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Link a Patient</Text>
            <TouchableOpacity onPress={() => { setCode(''); onClose(); }} style={styles.close}>
              <Feather name="x" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          <View style={styles.note}>
            <Feather name="info" size={13} color={PRIMARY} />
            <Text style={styles.noteText}>
              Ask the patient for their care code (e.g. DB-7G4K2P), shown on their profile.
            </Text>
          </View>

          <Text style={styles.label}>Patient Code</Text>
          <TextInput
            style={styles.input}
            placeholder="DB-XXXXXX"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholderTextColor={TEXT_MUTED}
            onSubmitEditing={submit}
            returnKeyType="done"
          />

          <TouchableOpacity style={[styles.submit, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading}>
            {loading ? <DotLoader color="#fff" size={6} /> : <Text style={styles.submitText}>Link Patient</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 28 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, color: TEXT_DARK, fontFamily: 'Inter_700Bold' },
  close: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: SOFT_BG, borderRadius: 14, padding: 12, marginBottom: 16 },
  noteText: { flex: 1, fontSize: 13, color: '#4C1D95', lineHeight: 18 },
  label: { fontSize: 13, color: '#475569', fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: TEXT_DARK, letterSpacing: 2, backgroundColor: '#F8FAFC', marginBottom: 18,
  },
  submit: { backgroundColor: PRIMARY, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
});
