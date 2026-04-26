import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Image, Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { getFriendlyErrorMessage } from '@/utils/errorUtils';

const PURPLE = '#6C47FF';
const WHITE = '#FFFFFF';
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ACTIVITY_LEVELS = ['Complete Rest', 'Light Activity', 'Normal'];
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MedEntry { name: string; dosage: string; frequency: string; duration: string; instructions: string; }

// ─── Reusable Field ───────────────────────────────────────────────────────────
function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false, required = false, optional = false }: any) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.reqBadge}>* Required</Text>}
        {optional && <Text style={styles.optBadge}>Optional</Text>}
      </View>
      <TextInput
        style={[styles.input, multiline && { height: 72, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHead({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionIcon}><Feather name={icon} size={16} color={PURPLE} /></View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CreatePlan() {
  const { api } = useApp();
  const cameraRef = useRef<CameraView>(null);
  const [camPermission, requestCamPermission] = useCameraPermissions();

  // ── Patient Info
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [phone, setPhone] = useState('');
  const [allergies, setAllergies] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // ── Discharge Details
  const [hospitalName, setHospitalName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [dischargeDate, setDischargeDate] = useState(new Date().toISOString().split('T')[0]);
  const [followUpDate, setFollowUpDate] = useState('');

  // ── Medications
  const [meds, setMeds] = useState<MedEntry[]>([
    { name: '', dosage: '', frequency: 'OD', duration: '7', instructions: '' },
  ]);

  // ── Recovery
  const [diet, setDiet] = useState('');
  const [activityLevel, setActivityLevel] = useState('Complete Rest');
  const [warningSigns, setWarningSigns] = useState('');

  // ── Scanning state
  const [showCamera, setShowCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStage, setScanStage] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false);

  // ── Output
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);

  // ─── Medicine helpers ──────────────────────────────────────────────────────
  const addMed = () => setMeds(p => [...p, { name: '', dosage: '', frequency: 'OD', duration: '7', instructions: '' }]);
  const removeMed = (i: number) => setMeds(p => p.filter((_, idx) => idx !== i));
  const updateMed = (i: number, field: keyof MedEntry, v: string) =>
    setMeds(p => p.map((m, idx) => idx === i ? { ...m, [field]: v } : m));

  // ─── OCR scan helper ───────────────────────────────────────────────────────
  const runOCR = async (base64: string) => {
    setScanning(true);
    setScanStage('🔍 Extracting medicines via OCR + AI...');
    try {
      const token = await AsyncStorage.getItem('discharge_buddy_token');
      const res = await fetch(`${API_URL}/api/ocr/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      if (!res.ok) throw new Error('OCR service failed. Try again.');
      const result = await res.json();
      const extracted: MedEntry[] = (result.medicines || []).map((m: any) => ({
        name: m.name || '',
        dosage: m.dosage || '',
        frequency: m.frequency_code || m.frequency || 'OD',
        duration: m.duration?.replace(/\D/g, '') || '7',
        instructions: m.notes || m.timing || '',
      }));
      if (extracted.length === 0) throw new Error('No medicines detected. Try a clearer image.');
      setMeds(extracted);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000); // auto-dismiss after 3s
    } catch (err: any) {
      Alert.alert('Scan Failed', err.message);
    } finally {
      setScanning(false);
      setScanStage('');
      setShowCamera(false);
    }
  };

  // ─── Camera capture ────────────────────────────────────────────────────────
  const handleCameraCapture = async () => {
    if (!cameraRef.current || scanning) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
    if (!photo?.base64) { Alert.alert('Error', 'Could not capture image.'); return; }
    await runOCR(photo.base64);
  };

  // ─── Gallery pick ──────────────────────────────────────────────────────────
  const handleGalleryPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    await runOCR(result.assets[0].base64);
  };

  // ─── Show scanner options ──────────────────────────────────────────────────
  const handleScanOptions = () => {
    Alert.alert('Scan Prescription', 'How would you like to provide the prescription?', [
      {
        text: '📷 Take Photo',
        onPress: async () => {
          if (!camPermission?.granted) await requestCamPermission();
          setShowCamera(true);
        },
      },
      { text: '🖼️ Choose from Gallery', onPress: handleGalleryPick },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ─── Generate QR ──────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    const missing = [];
    if (!patientName.trim()) missing.push('Patient Name');
    if (!bloodGroup) missing.push('Blood Group');
    if (!emergencyContact.trim()) missing.push('Emergency Contact');
    if (!doctorName.trim()) missing.push('Discharging Doctor');
    if (!diagnosis.trim()) missing.push('Diagnosis');
    if (!meds[0].name.trim()) missing.push('At least one Medication');

    if (missing.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Missing Information', 
        `Please complete the following fields:\n\n• ${missing.join('\n• ')}`,
        [{ text: 'OK' }]
      );
      return;
    }
    setLoading(true);
    try {
      const payload = {
        patientName, age, bloodGroup, phone, allergies, emergencyContact,
        hospitalName, doctorName, diagnosis, dischargeDate, followUpDate,
        diet, activityLevel, warningSigns,
        medicines: meds.filter(m => m.name.trim()).map(m => ({
          ...m, duration: parseInt(m.duration) || 7,
        })),
      };
      const result = await api.createDischargePlan(payload);
      
      if (result && result.planId) {
        setQrData(JSON.stringify({ planId: result.planId }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error("The server responded but no Plan ID was generated.");
      }
    } catch (err: any) {
      console.error("[CreatePlan] Generation Error:", err);
      Alert.alert('Generation Failed', getFriendlyErrorMessage(err, 'general'));
    } finally {
      setLoading(false);
    }
  };

  // ─── QR Screen ─────────────────────────────────────────────────────────────
  if (qrData) {
    return (
      <View style={styles.qrScreen}>
        <LinearGradient colors={['#4B26C8', PURPLE]} style={styles.qrHeader}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)' as any)} style={{ marginBottom: 12 }}>
            <Feather name="arrow-left" size={22} color={WHITE} />
          </TouchableOpacity>
          <Text style={styles.qrHeaderTitle}>Discharge Plan Ready</Text>
          <Text style={styles.qrHeaderSub}>Patient: {patientName}</Text>
        </LinearGradient>
        <ScrollView contentContainerStyle={{ alignItems: 'center', padding: 24, paddingBottom: 48 }}>
          <Text style={styles.qrInstr}>Show this to the patient to scan with their app</Text>
          <View style={styles.qrBox}>
            <QRCode value={qrData} size={260} color={PURPLE} backgroundColor={WHITE} />
          </View>
          {allergies ? (
            <View style={styles.allergyBadge}>
              <Feather name="alert-triangle" size={14} color="#ef4444" />
              <Text style={styles.allergyText}>⚠️ Allergy: {allergies}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.replace('/(tabs)' as any)}
            activeOpacity={0.8}
          >
            <Feather name="check" size={18} color={WHITE} />
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn} onPress={() => setQrData(null)}>
            <Text style={styles.editBtnText}>← Edit Plan</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── Camera Screen ─────────────────────────────────────────────────────────
  if (showCamera) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" />
        <View style={styles.camOverlay}>
          <TouchableOpacity style={styles.camClose} onPress={() => setShowCamera(false)}>
            <Feather name="x" size={24} color={WHITE} />
          </TouchableOpacity>
          <View style={styles.camFrame} />
          <Text style={styles.camText}>Point at the prescription</Text>
          {scanning ? (
            <View style={styles.scanningPill}>
              <ActivityIndicator size="small" color={WHITE} />
              <Text style={styles.scanningText}>{scanStage}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.captureBtn} onPress={handleCameraCapture}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ─── Main Form ─────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Header */}
      <LinearGradient colors={['#4B26C8', PURPLE]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Issue Discharge Plan</Text>
        <Text style={styles.headerSub}>Clinical-grade recovery handover</Text>
      </LinearGradient>

      <View style={styles.form}>

        {/* ── Scan Prescription — FIRST thing visible ── */}
        <View style={styles.scanCard}>
          <View style={styles.scanCardLeft}>
            <Feather name="file-text" size={20} color={PURPLE} />
            <View>
              <Text style={styles.scanCardTitle}>Scan Prescription</Text>
              <Text style={styles.scanCardSub}>Auto-fill all medicine details from a photo</Text>
            </View>
          </View>
          <View style={styles.scanCardBtns}>
            <TouchableOpacity
              style={styles.scanOptBtn}
              onPress={async () => {
                if (!camPermission?.granted) await requestCamPermission();
                setShowCamera(true);
              }}
            >
              <Feather name="camera" size={15} color={WHITE} />
              <Text style={styles.scanOptBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.scanOptBtn, { backgroundColor: '#8B5CF6' }]} onPress={handleGalleryPick}>
              <Feather name="image" size={15} color={WHITE} />
              <Text style={styles.scanOptBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {scanning && (
          <View style={styles.scanningCard}>
            <ActivityIndicator color={PURPLE} />
            <Text style={styles.scanningCardText}>{scanStage || 'Analyzing prescription...'}</Text>
          </View>
        )}

        {scanSuccess && (
          <View style={styles.scanSuccessBanner}>
            <Feather name="check-circle" size={15} color="#10b981" />
            <Text style={styles.scanSuccessText}>Medicines auto-filled — review and edit below</Text>
          </View>
        )}

        {/* ── Section 1: Patient Info ── */}
        <SectionHead icon="user" title="Patient Information" />

        <Field label="Full Name" required value={patientName} onChangeText={setPatientName} placeholder="e.g. John Doe" />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Age" optional value={age} onChangeText={setAge} placeholder="e.g. 45" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Blood Group</Text>
              <Text style={styles.reqBadge}>* Required</Text>
            </View>
            <View style={styles.tagRow}>
              {BLOOD_GROUPS.map(bg => (
                <TouchableOpacity
                  key={bg}
                  style={[styles.tag, bloodGroup === bg && styles.tagActive]}
                  onPress={() => setBloodGroup(bg)}
                >
                  <Text style={[styles.tagText, bloodGroup === bg && styles.tagTextActive]}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <Field label="Phone Number" optional value={phone} onChangeText={setPhone} placeholder="+91 9XXXXXXXX" keyboardType="phone-pad" />
        <Field label="Allergies" optional value={allergies} onChangeText={setAllergies} placeholder="e.g. Penicillin, Sulfa drugs (leave blank if none)" />
        <Field label="Emergency Contact" required value={emergencyContact} onChangeText={setEmergencyContact} placeholder="Name — Phone number" />

        {/* ── Section 2: Discharge Details ── */}
        <SectionHead icon="activity" title="Discharge Details" />

        <Field label="Hospital / Clinic" optional value={hospitalName} onChangeText={setHospitalName} placeholder="e.g. City General Hospital" />
        <Field label="Discharging Doctor" required value={doctorName} onChangeText={setDoctorName} placeholder="Dr. Name" />
        <Field label="Diagnosis / Condition" required value={diagnosis} onChangeText={setDiagnosis} placeholder="e.g. Viral Pneumonia" multiline />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Discharge Date" optional value={dischargeDate} onChangeText={setDischargeDate} placeholder="YYYY-MM-DD" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Field label="Follow-up Date" optional value={followUpDate} onChangeText={setFollowUpDate} placeholder="YYYY-MM-DD" />
          </View>
        </View>

        {/* ── Section 3: Medications ── */}
        <SectionHead icon="package" title="Medications" />

        {meds.map((med, idx) => (
          <View key={idx} style={styles.medCard}>
            <View style={styles.medCardHeader}>
              <Text style={styles.medCardNum}>Medicine {idx + 1}</Text>
              {meds.length > 1 && (
                <TouchableOpacity onPress={() => removeMed(idx)}>
                  <Feather name="trash-2" size={16} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={styles.medInput}
              value={med.name}
              onChangeText={v => updateMed(idx, 'name', v)}
              placeholder="Medicine name"
              placeholderTextColor="#94a3b8"
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.medInput, { flex: 1 }]}
                value={med.dosage}
                onChangeText={v => updateMed(idx, 'dosage', v)}
                placeholder="Dosage (500mg)"
                placeholderTextColor="#94a3b8"
              />
              <TextInput
                style={[styles.medInput, { flex: 0.7, marginLeft: 10 }]}
                value={med.duration}
                onChangeText={v => updateMed(idx, 'duration', v)}
                placeholder="Days"
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.freqRow}>
              {['OD', 'BD', 'TID', 'QID'].map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.freqBtn, med.frequency === f && styles.freqBtnActive]}
                  onPress={() => updateMed(idx, 'frequency', f)}
                >
                  <Text style={[styles.freqText, med.frequency === f && styles.freqTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.medInput, { marginTop: 8 }]}
              value={med.instructions}
              onChangeText={v => updateMed(idx, 'instructions', v)}
              placeholder="Special instructions (optional)"
              placeholderTextColor="#94a3b8"
            />
          </View>
        ))}
        <TouchableOpacity style={styles.addMedBtn} onPress={addMed}>
          <Feather name="plus" size={16} color={PURPLE} />
          <Text style={styles.addMedText}>Add Another Medicine</Text>
        </TouchableOpacity>

        {/* ── Section 4: Recovery Notes ── */}
        <SectionHead icon="heart" title="Recovery Instructions" />

        <Field label="Diet Restrictions" value={diet} onChangeText={setDiet} placeholder="e.g. Low sodium, avoid dairy" multiline />

        <Text style={styles.label}>Activity Level</Text>
        <View style={[styles.tagRow, { marginBottom: 20 }]}>
          {ACTIVITY_LEVELS.map(a => (
            <TouchableOpacity
              key={a}
              style={[styles.tag, { flex: 1 }, activityLevel === a && styles.tagActive]}
              onPress={() => setActivityLevel(a)}
            >
              <Text style={[styles.tagText, activityLevel === a && styles.tagTextActive]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label="Warning Signs to Watch For" value={warningSigns} onChangeText={setWarningSigns}
          placeholder="e.g. High fever, chest pain, difficulty breathing" multiline />

        {/* ── Generate Button ── */}
        <TouchableOpacity style={styles.genBtn} onPress={handleGenerate} disabled={loading}>
          {loading
            ? <ActivityIndicator color={WHITE} />
            : <>
              <Feather name="maximize" size={18} color={WHITE} />
              <Text style={styles.genBtnText}>Generate Discharge QR</Text>
            </>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F4FB' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 28, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  backBtn: { marginBottom: 12 },
  headerTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: WHITE },
  headerSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  form: { padding: 20 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 28, marginBottom: 16 },
  sectionIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#1e1b4b', flex: 1 },

  fieldWrap: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  label: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  reqBadge: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#ef4444', backgroundColor: '#fef2f2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  optBadge: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#94a3b8', backgroundColor: '#f8fafc', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  input: { backgroundColor: WHITE, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', fontFamily: 'Inter_400Regular', fontSize: 15, color: '#1e1b4b' },
  row: { flexDirection: 'row', gap: 0 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  tag: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: WHITE },
  tagActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  tagText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#64748b' },
  tagTextActive: { color: WHITE },

  // Medications — Scan Card
  scanCard: { backgroundColor: '#EDE9FE', borderRadius: 18, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#DDD6FE' },
  scanCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  scanCardTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#1e1b4b' },
  scanCardSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#64748b', marginTop: 1 },
  scanCardBtns: { flexDirection: 'row', gap: 6 },
  scanOptBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PURPLE, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 },
  scanOptBtnText: { color: WHITE, fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  scanningCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#EDE9FE', padding: 14, borderRadius: 14, marginBottom: 12 },
  scanningCardText: { color: PURPLE, fontFamily: 'Inter_500Medium', fontSize: 13 },
  scanSuccessBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 12, padding: 12, marginBottom: 12 },
  scanSuccessText: { color: '#16a34a', fontFamily: 'Inter_500Medium', fontSize: 13, flex: 1 },
  medCard: { backgroundColor: WHITE, padding: 16, borderRadius: 20, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  medCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  medCardNum: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#94a3b8' },
  medInput: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 10, fontSize: 15, fontFamily: 'Inter_400Regular', color: '#1e1b4b' },
  freqRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  freqBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  freqBtnActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  freqText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#64748b' },
  freqTextActive: { color: WHITE },
  addMedBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: PURPLE, borderStyle: 'dashed', marginBottom: 4 },
  addMedText: { color: PURPLE, fontFamily: 'Inter_600SemiBold', fontSize: 14 },

  // Generate
  genBtn: { backgroundColor: PURPLE, paddingVertical: 18, borderRadius: 18, alignItems: 'center', marginTop: 28, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  genBtnText: { color: WHITE, fontSize: 16, fontFamily: 'Inter_700Bold' },

  // Camera
  camOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  camClose: { position: 'absolute', top: 60, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 20 },
  camFrame: { width: 280, height: 180, borderWidth: 2, borderColor: PURPLE, borderRadius: 16 },
  camText: { color: WHITE, marginTop: 16, fontFamily: 'Inter_500Medium', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  scanningPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.7)', padding: 14, borderRadius: 30, marginTop: 24 },
  scanningText: { color: WHITE, fontFamily: 'Inter_500Medium', fontSize: 13 },
  captureBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', marginTop: 32, borderWidth: 3, borderColor: WHITE },
  captureInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: WHITE },

  // QR Screen
  qrScreen: { flex: 1, backgroundColor: WHITE },
  qrHeader: { padding: 24, paddingTop: 60, paddingBottom: 28 },
  qrHeaderTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: WHITE },
  qrHeaderSub: { fontSize: 14, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  qrInstr: { fontSize: 14, fontFamily: 'Inter_500Medium', color: '#64748b', textAlign: 'center', marginBottom: 24 },
  qrBox: { padding: 20, borderRadius: 24, shadowColor: PURPLE, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 8, backgroundColor: WHITE },
  allergyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef2f2', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginTop: 20, borderWidth: 1, borderColor: '#fecaca' },
  allergyText: { color: '#ef4444', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  doneBtn: { backgroundColor: PURPLE, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, marginTop: 28, flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneBtnText: { color: WHITE, fontSize: 16, fontFamily: 'Inter_700Bold' },
  editBtn: { paddingVertical: 12, marginTop: 8 },
  editBtnText: { color: '#94a3b8', fontFamily: 'Inter_500Medium', fontSize: 14 },
});
