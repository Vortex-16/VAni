import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useApp } from '@/context/AppContext';
import * as Haptics from 'expo-haptics';
import { getFriendlyErrorMessage } from '@/utils/errorUtils';

const PURPLE = "#6C47FF";
const WHITE = "#FFFFFF";

export default function ScanQR() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const { addMedicine, api, refreshData } = useApp();

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>We need camera access to scan QRs</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }: any) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (data.startsWith('{')) {
        const parsed = JSON.parse(data);
        if (parsed.planId) {
          // New backend flow: Fetch plan preview from server
          const planData = await api.getDischargePlan(parsed.planId);
          if (planData && planData.data) {
            // Check if it's double-nested (e.g. { data: { data: { ... } } })
            const innerData = planData.data.data ? planData.data.data : planData.data;
            setPlan({ ...innerData, id: parsed.planId });
          } else if (planData && planData.medicines) {
            // Case where plan is returned without nested data wrapper
            setPlan({ ...planData, id: parsed.planId });
          } else {
            throw new Error("Plan data is missing or malformed.");
          }
        } else if (parsed.medicines) {
          // Legacy/Mock flow
          setPlan(parsed);
        } else {
          throw new Error("Invalid format.");
        }
      } else {
        throw new Error("Invalid QR code. Please scan a Discharge Buddy QR.");
      }
    } catch (err: any) {
      console.error("[ScanQR] Fetch Error:", err);
      Alert.alert("Scan Failed", getFriendlyErrorMessage(err, 'scan'));
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const meds = plan?.medicines || plan?.normalizedMeds || [];
      if (meds.length === 0) {
        Alert.alert("No Medicines", "This plan has no medicines to import.");
        return;
      }

      if (plan.id) {
        // Backend Flow
        await api.importDischargePlan(plan.id, "merge");
        // Pull latest medicines/logs into global state
        await refreshData();
      } else {
        // Legacy mock flow
        const freqToTimes: Record<string, string[]> = {
          OD:  ["08:00"], BD:  ["08:00", "20:00"], TID: ["08:00", "14:00", "20:00"], QID: ["08:00", "12:00", "18:00", "22:00"],
        };
        await Promise.all(meds.map((med: any) => addMedicine({
          name: med.name, dosage: med.dosage || '—', frequency: med.frequency || 'OD',
          times: freqToTimes[med.frequency?.toUpperCase()] ?? ["08:00"],
          instructions: med.instructions || '', simplifiedInstructions: med.instructions || '',
          startDate: new Date().toISOString(), color: '#6C47FF',
        })));
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("✅ Plan Imported!", `${meds.length} medication(s) added to your schedule.`);
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("[ScanQR] Import Error:", err);
      Alert.alert("Import Failed", getFriendlyErrorMessage(err, 'import'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
            barcodeTypes: ["qr"],
        }}
      />
      
      {/* Overlay UI */}
      <View style={styles.overlay}>
        {/* Only show close button when modal is NOT open */}
        {!plan && (
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Feather name="x" size={24} color={WHITE} />
          </TouchableOpacity>
        )}

        <View style={styles.scanFrameWrap}>
           <View style={styles.scanFrame} />
           <Text style={styles.scanText}>Point camera at QR code</Text>
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
             <ActivityIndicator size="large" color={PURPLE} />
             <Text style={styles.loadingText}>Reading Plan...</Text>
          </View>
        )}
      </View>

      {/* Preview Modal — solid white sheet, no bleed-through */}
      <Modal visible={!!plan} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            {/* Close button inside the modal */}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => { setPlan(null); setScanned(false); }}
            >
              <Feather name="x" size={20} color="#64748b" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
               <Text style={styles.modalTitle}>Recovery Plan Summary</Text>
               <Text style={styles.patientName}>{plan?.patientName}{plan?.age ? `, ${plan.age}` : ''}</Text>
               {plan?.hospitalName ? <Text style={styles.subInfo}>🏥 {plan.hospitalName}{plan?.doctorName ? `  ·  Dr. ${plan.doctorName}` : ''}</Text> : null}
               {plan?.diagnosis ? <Text style={styles.subInfo}>🩺 {plan.diagnosis}</Text> : null}

               {/* Allergy Warning — show prominently if present */}
               {plan?.allergies ? (
                 <View style={styles.allergyWarn}>
                   <Feather name="alert-triangle" size={14} color="#ef4444" />
                   <Text style={styles.allergyWarnText}>⚠️ Allergy: {plan.allergies}</Text>
                 </View>
               ) : null}

               {/* Stats row */}
               <View style={styles.statsRow}>
                 <View style={styles.statItem}>
                   <Text style={styles.statVal}>{plan?.medicines?.length || 0}</Text>
                   <Text style={styles.statLab}>Medicines</Text>
                 </View>
                 <View style={styles.divider} />
                 <View style={styles.statItem}>
                   <Text style={styles.statVal}>
                     {plan?.medicines?.reduce((acc: number, m: any) => {
                       const map: any = { OD: 1, BD: 2, TID: 3, QID: 4 };
                       return acc + (map[m.frequency] || 1);
                     }, 0) || 0}
                   </Text>
                   <Text style={styles.statLab}>Doses/Day</Text>
                 </View>
                 {plan?.bloodGroup ? (
                   <>
                     <View style={styles.divider} />
                     <View style={styles.statItem}>
                       <Text style={[styles.statVal, { color: '#ef4444' }]}>{plan.bloodGroup}</Text>
                       <Text style={styles.statLab}>Blood Group</Text>
                     </View>
                   </>
                 ) : null}
               </View>

               {/* Follow-up date */}
               {plan?.followUpDate ? (
                 <View style={styles.followUpCard}>
                   <Feather name="calendar" size={14} color={PURPLE} />
                   <Text style={styles.followUpText}>Follow-up: {plan.followUpDate}</Text>
                 </View>
               ) : null}

               {/* Medicine list */}
               <View style={styles.medList}>
                 {plan?.medicines?.map((med: any, idx: number) => (
                   <View key={idx} style={styles.medItem}>
                     <View style={[styles.colorDot, { backgroundColor: '#6C47FF' }]} />
                     <View style={{ flex: 1 }}>
                       <Text style={styles.medName}>{med.name}{med.dosage ? ` (${med.dosage})` : ''}</Text>
                       <Text style={styles.medFreq}>{med.frequency} · {med.duration} days{med.instructions ? `  —  ${med.instructions}` : ''}</Text>
                     </View>
                   </View>
                 ))}
               </View>

               {/* Recovery notes */}
               {plan?.diet ? <Text style={styles.noteChip}>🥗 Diet: {plan.diet}</Text> : null}
               {plan?.activityLevel ? <Text style={styles.noteChip}>🏃 Activity: {plan.activityLevel}</Text> : null}
               {plan?.warningSigns ? (
                 <View style={styles.warnCard}>
                   <Text style={styles.warnTitle}>⚠️ Warning Signs</Text>
                   <Text style={styles.warnText}>{plan.warningSigns}</Text>
                 </View>
               ) : null}

               <Text style={styles.sectionTitle}>Your Existing Medicines</Text>
               <Text style={styles.sectionSub}>What should happen to medicines you already have?</Text>
               <View style={styles.optionsRow}>
                  <TouchableOpacity 
                    style={[styles.optBtn, importMode === 'merge' && styles.optBtnActive]} 
                    onPress={() => setImportMode('merge')}
                  >
                    <Feather name="plus" size={14} color={importMode === 'merge' ? '#fff' : '#64748b'} />
                    <Text style={[styles.optText, importMode === 'merge' && styles.optTextActive]}>Keep & Add</Text>
                    <Text style={[styles.optSubText, importMode === 'merge' && { color: 'rgba(255,255,255,0.8)' }]}>Add new to existing</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.optBtn, importMode === 'replace' && { backgroundColor: '#fef2f2', borderColor: '#ef4444' }]} 
                    onPress={() => setImportMode('replace')}
                  >
                    <Feather name="refresh-cw" size={14} color={importMode === 'replace' ? '#ef4444' : '#64748b'} />
                    <Text style={[styles.optText, importMode === 'replace' && { color: '#ef4444' }]}>Start Fresh</Text>
                    <Text style={[styles.optSubText, importMode === 'replace' && { color: '#ef4444' }]}>Archive old, use new</Text>
                  </TouchableOpacity>
               </View>

               {importMode === 'replace' && (
                 <Text style={styles.warningText}>⚠️ Old medicines are safely archived, not deleted.</Text>
               )}

               <TouchableOpacity style={styles.importBtn} onPress={handleImport}>
                  <Text style={styles.importBtnText}>Confirm Import</Text>
               </TouchableOpacity>
               
               <TouchableOpacity style={styles.cancelBtn} onPress={() => { setPlan(null); setScanned(false); }}>
                  <Text style={styles.cancelText}>Cancel — Scan Again</Text>
               </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 60, left: 20, padding: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  scanFrameWrap: { alignItems: 'center', gap: 20 },
  scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: PURPLE, borderRadius: 24 },
  scanText: { color: WHITE, fontSize: 16, fontFamily: 'Inter_500Medium', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)' },
  loadingText: { color: WHITE, marginTop: 12, fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  text: { fontSize: 16, textAlign: 'center', color: '#64748b', marginBottom: 20 },
  btn: { backgroundColor: PURPLE, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  btnText: { color: WHITE, fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  // Modal — solid white, no bleed-through
  modalBg: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: WHITE, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingTop: 16, maxHeight: '88%' },
  modalCloseBtn: { alignSelf: 'flex-end', padding: 8, backgroundColor: '#f1f5f9', borderRadius: 20, marginBottom: 4 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1E1B4B', textAlign: 'center', marginBottom: 4 },
  patientName: { fontSize: 14, fontFamily: 'Inter_500Medium', color: '#64748b', textAlign: 'center', marginBottom: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 20, backgroundColor: '#f8fafc', padding: 16, borderRadius: 20 },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 24, fontFamily: 'Inter_700Bold', color: PURPLE },
  statLab: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#94a3b8' },
  divider: { width: 1, height: 40, backgroundColor: '#e2e8f0' },
  medList: { gap: 10, marginBottom: 20 },
  medItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', padding: 12, borderRadius: 14 },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  medName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#1E1B4B' },
  medFreq: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#64748b' },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#1E1B4B', marginBottom: 4 },
  sectionSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#94a3b8', marginBottom: 12 },
  optionsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  optBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', gap: 4 },
  optBtnActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  optText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#64748b' },
  optTextActive: { color: WHITE },
  optSubText: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#94a3b8', textAlign: 'center' },
  warningText: { fontSize: 12, color: '#ef4444', marginBottom: 16, textAlign: 'center' },
  importBtn: { backgroundColor: PURPLE, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  importBtnText: { color: WHITE, fontSize: 16, fontFamily: 'Inter_700Bold' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelText: { color: '#94a3b8', fontSize: 14, fontFamily: 'Inter_500Medium' },
  subInfo: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#64748b', textAlign: 'center', marginBottom: 4 },
  allergyWarn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 10, marginVertical: 10 },
  allergyWarnText: { color: '#ef4444', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  followUpCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EDE9FE', borderRadius: 12, padding: 10, marginBottom: 14 },
  followUpText: { color: PURPLE, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  noteChip: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#475569', backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 6 },
  warnCard: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 12, padding: 12, marginBottom: 12 },
  warnTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#c2410c', marginBottom: 4 },
  warnText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#7c2d12' },
});
