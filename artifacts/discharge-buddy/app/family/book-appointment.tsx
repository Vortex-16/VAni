import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Platform, Alert, ActivityIndicator, KeyboardAvoidingView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';

const BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const PURPLE = '#6C47FF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const INPUT_BORDER = '#E2E8F0';

export default function BookAppointment() {
  const insets = useSafeAreaInsets();
  const { familyMembers, showToast } = useApp();

  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBook = async () => {
    if (!selectedMember) { Alert.alert('Required', 'Please select a family member.'); return; }
    if (!doctorName.trim() || !date.trim() || !time.trim()) {
      Alert.alert('Required', 'Please fill out the doctor name, date, and time.');
      return;
    }

    setLoading(true);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    setLoading(false);

    const member = familyMembers.find(m => m.id === selectedMember);
    showToast('Appointment Booked', `Your follow-up with ${doctorName} for ${member?.name.split(' ')[0]} is confirmed!`);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Follow-up</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        
        {/* ── Select Member ── */}
        <Text style={styles.sectionTitle}>Who is this for?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberScroll}>
          {familyMembers.map(m => (
            <TouchableOpacity 
              key={m.id} 
              style={[styles.memberCard, selectedMember === m.id && styles.memberCardActive]}
              onPress={() => setSelectedMember(m.id)}
            >
              <View style={[styles.memberAvatar, selectedMember === m.id && { backgroundColor: '#fff' }]}>
                <Text style={[styles.memberInitials, selectedMember === m.id && { color: PURPLE }]}>
                  {m.name.substring(0,2).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.memberName, selectedMember === m.id && { color: '#fff' }]} numberOfLines={1}>
                {m.name.split(' ')[0]}
              </Text>
              <Text style={[styles.memberRelation, selectedMember === m.id && { color: 'rgba(255,255,255,0.8)' }]}>
                {m.relation || 'Member'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Form ── */}
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Doctor's Name</Text>
          <View style={styles.inputWrap}>
            <Feather name="user" size={18} color={TEXT_MUTED} />
            <TextInput style={styles.input} placeholder="e.g. Dr. Vivek Mehta" value={doctorName} onChangeText={setDoctorName} placeholderTextColor={TEXT_MUTED} />
          </View>

          <Text style={styles.fieldLabel}>Reason for Visit</Text>
          <View style={styles.inputWrap}>
            <Feather name="info" size={18} color={TEXT_MUTED} />
            <TextInput style={styles.input} placeholder="e.g. Routine checkup, BP review" value={reason} onChangeText={setReason} placeholderTextColor={TEXT_MUTED} />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Date</Text>
              <View style={styles.inputWrap}>
                <Feather name="calendar" size={18} color={TEXT_MUTED} />
                <TextInput style={styles.input} placeholder="DD/MM/YY" value={date} onChangeText={setDate} placeholderTextColor={TEXT_MUTED} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Time</Text>
              <View style={styles.inputWrap}>
                <Feather name="clock" size={18} color={TEXT_MUTED} />
                <TextInput style={styles.input} placeholder="HH:MM" value={time} onChangeText={setTime} placeholderTextColor={TEXT_MUTED} />
              </View>
            </View>
          </View>
        </View>

        {/* ── Submit Button ── */}
        <TouchableOpacity style={styles.submitBtnWrap} onPress={handleBook} disabled={loading}>
          <LinearGradient colors={['#7E57C2', '#5E35B1']} style={styles.submitBtn}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.submitBtnText}>Confirm Appointment</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 15,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1, borderBottomColor: INPUT_BORDER
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, color: TEXT_DARK, fontFamily: 'Inter_700Bold' },
  
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  
  sectionTitle: { fontSize: 16, color: TEXT_DARK, fontFamily: 'Inter_700Bold', marginBottom: 12 },
  
  memberScroll: { gap: 12, paddingBottom: 10 },
  memberCard: {
    width: 100, backgroundColor: CARD_BG, borderRadius: 20, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: INPUT_BORDER,
  },
  memberCardActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  memberAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8
  },
  memberInitials: { fontSize: 16, color: TEXT_MUTED, fontFamily: 'Inter_700Bold' },
  memberName: { fontSize: 13, color: TEXT_DARK, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  memberRelation: { fontSize: 11, color: TEXT_MUTED, fontFamily: 'Inter_500Medium', textAlign: 'center', marginTop: 2 },

  formCard: {
    backgroundColor: CARD_BG, borderRadius: 24, padding: 20, marginTop: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2,
  },
  fieldLabel: { fontSize: 13, color: TEXT_DARK, fontFamily: 'Inter_600SemiBold', marginBottom: 6, marginLeft: 4 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: INPUT_BORDER,
    borderRadius: 16, paddingHorizontal: 16, minHeight: 52, paddingVertical: 12, marginBottom: 16,
  },
  input: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium', color: TEXT_DARK },
  row: { flexDirection: 'row', gap: 12 },

  submitBtnWrap: { marginTop: 30, borderRadius: 20, overflow: 'hidden', shadowColor: '#5E35B1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 },
  submitBtn: { paddingVertical: 18, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
});
