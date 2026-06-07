import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, Platform, ScrollView, TextInput, KeyboardAvoidingView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { TranslateText as Text } from '@/components/TranslateText';

const PRIMARY = '#7C3AED';
const PRIMARY_DARK = '#5B21B6';
const WHITE = '#FFFFFF';
const MUTED = '#94A3B8';
const SOFT_BG = '#F5F3FF';
const TEXT_DARK = '#1E1B4B';
const INPUT_BG = '#F8FAFC';

export type AppRole = 'patient' | 'family' | 'caregiver' | 'doctor';

const ROLE_OPTIONS: { role: AppRole; icon: keyof typeof Feather.glyphMap; label: string; sub: string }[] = [
  { role: 'patient', icon: 'user', label: 'Patient', sub: 'Track your own recovery' },
  { role: 'family', icon: 'heart', label: 'Family Member', sub: 'Monitor a loved one' },
  { role: 'caregiver', icon: 'users', label: 'Caregiver', sub: 'Manage patients you care for' },
  { role: 'doctor', icon: 'activity', label: 'Doctor', sub: 'Oversee and create discharge plans' },
];

interface Props {
  visible: boolean;
  email?: string;
  suggestedRole?: AppRole;
  onConfirm: (role: AppRole, extraData: any) => void;
  onCancel: () => void;
}

export function RoleSelectModal({ visible, email, suggestedRole, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<AppRole>(suggestedRole ?? 'patient');
  const [step, setStep] = useState<1 | 2>(1);

  // Form Fields
  const [phone, setPhone] = useState('');
  const [relationshipPreference, setRelationshipPreference] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [hospital, setHospital] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setSelected(suggestedRole ?? 'patient');
      setStep(1);
      setError('');
    }
  }, [visible, suggestedRole]);

  const validateEmailForClinical = () => {
    if ((selected === 'caregiver' || selected === 'doctor') && email && !email.toLowerCase().endsWith('@doc.in')) {
      setError('Caregiver and Doctor accounts require an @doc.in email address.');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (!validateEmailForClinical()) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(2);
  };

  const submit = () => {
    if (!phone) {
      setError('Phone number is required.');
      return;
    }
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const extraData = {
      phone,
      relationshipPreference: selected === 'family' ? relationshipPreference : undefined,
      emergencyContactName: selected === 'family' ? emergencyContact : undefined,
      hospital: (selected === 'caregiver' || selected === 'doctor') ? hospital : undefined,
      designation: selected === 'caregiver' ? designation : undefined,
      department: selected === 'doctor' ? department : undefined,
      registrationNumber: selected === 'doctor' ? registrationNumber : undefined,
      specialization: selected === 'doctor' ? specialization : undefined,
    };
    onConfirm(selected, extraData);
  };

  const renderField = (placeholder: string, value: string, setter: (val: string) => void, icon: any, autoCapitalize='none') => (
    <View style={styles.inputWrap}>
      <Feather name={icon} size={18} color={MUTED} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={MUTED}
        value={value}
        onChangeText={setter}
        autoCapitalize={autoCapitalize as any}
      />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill}>
          <Animated.View entering={FadeIn.duration(180)} style={styles.outer}>
            <Animated.View entering={SlideInDown.springify().damping(18)} style={styles.card}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                
                {!!error && (
                  <View style={styles.errorBox}>
                    <Feather name="alert-circle" size={14} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {step === 1 ? (
                  <>
                    <View style={styles.iconBadge}><Feather name="user-check" size={22} color={WHITE} /></View>
                    <Text style={styles.title}>How will you use DischargeBuddy?</Text>
                    <Text style={styles.sub}>{email ? `Signing in as ${email}` : 'Choose the role that fits you'}</Text>

                    <View style={styles.optList}>
                      {ROLE_OPTIONS.map((opt) => {
                        const active = selected === opt.role;
                        return (
                          <TouchableOpacity
                            key={opt.role} activeOpacity={0.85} onPress={() => setSelected(opt.role)}
                            style={[styles.opt, active && styles.optActive]}
                          >
                            <View style={[styles.optIcon, { backgroundColor: active ? PRIMARY : SOFT_BG }]}>
                              <Feather name={opt.icon} size={20} color={active ? WHITE : PRIMARY} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.optLabel, active && { color: PRIMARY }]}>{opt.label}</Text>
                              <Text style={styles.optSub}>{opt.sub}</Text>
                            </View>
                            <Feather name={active ? 'check-circle' : 'circle'} size={20} color={active ? PRIMARY : '#CBD5E1'} />
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={styles.confirmBtn}>
                      <LinearGradient colors={[PRIMARY, PRIMARY_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.confirmGrad}>
                        <Text style={styles.confirmText}>NEXT</Text>
                        <Feather name="arrow-right" size={18} color={WHITE} />
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Feather name="arrow-left" size={20} color={TEXT_DARK} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { marginTop: 10 }]}>Complete your Profile</Text>
                    <Text style={styles.sub}>Almost done setting up your {selected} account.</Text>

                    {renderField("Phone Number", phone, setPhone, "phone")}

                    {selected === 'family' && (
                      <>
                        {renderField("Relationship to Patient (e.g., Son, Wife)", relationshipPreference, setRelationshipPreference, "heart", "words")}
                        {renderField("Emergency Contact Number", emergencyContact, setEmergencyContact, "phone-call")}
                      </>
                    )}

                    {selected === 'caregiver' && (
                      <>
                        {renderField("Hospital / Organization", hospital, setHospital, "home", "words")}
                        {renderField("Designation (e.g., Nurse)", designation, setDesignation, "briefcase", "words")}
                      </>
                    )}

                    {selected === 'doctor' && (
                      <>
                        {renderField("Hospital / Clinic Name", hospital, setHospital, "home", "words")}
                        {renderField("Department", department, setDepartment, "layers", "words")}
                        {renderField("Registration Number", registrationNumber, setRegistrationNumber, "award")}
                        {renderField("Specialization", specialization, setSpecialization, "star", "words")}
                      </>
                    )}

                    <TouchableOpacity onPress={submit} activeOpacity={0.85} style={styles.confirmBtn}>
                      <LinearGradient colors={[PRIMARY, PRIMARY_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.confirmGrad}>
                        <Text style={styles.confirmText}>FINISH SIGN UP</Text>
                        <Feather name="check" size={18} color={WHITE} />
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

              </ScrollView>
            </Animated.View>
          </Animated.View>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, justifyContent: 'flex-end' },
  card: { backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 24, maxHeight: '90%' },
  iconBadge: { alignSelf: 'center', width: 52, height: 52, borderRadius: 26, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  title: { fontSize: 20, fontFamily: 'Inter_800ExtraBold', color: TEXT_DARK, textAlign: 'center', letterSpacing: -0.3 },
  sub: { fontSize: 13, color: MUTED, textAlign: 'center', marginTop: 4, marginBottom: 18 },
  optList: { gap: 10 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: '#E2E8F0' },
  optActive: { borderColor: PRIMARY, backgroundColor: SOFT_BG },
  optIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optLabel: { fontSize: 15, fontFamily: 'Inter_700Bold', color: TEXT_DARK },
  optSub: { fontSize: 12, color: MUTED, marginTop: 2 },
  confirmBtn: { borderRadius: 14, marginTop: 20, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 7 },
  confirmGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 16 },
  confirmText: { color: WHITE, fontSize: 15, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  cancelBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  cancelText: { fontSize: 14, color: MUTED, fontFamily: 'Inter_600SemiBold' },
  backBtn: { alignSelf: 'flex-start', marginBottom: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: INPUT_BG, borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 10, borderWidth: 1.5, borderColor: '#E2E8F0', marginBottom: 12 },
  input: { flex: 1, fontSize: 15, color: TEXT_DARK, height: Platform.OS === 'ios' ? undefined : 40 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { flex: 1, color: '#EF4444', fontSize: 13, fontFamily: 'Inter_500Medium' },
});
