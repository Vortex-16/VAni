import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import type { Patient } from '@/context/AppContext';

const PURPLE = '#6C47FF';
const WHITE = '#FFFFFF';

// ─── Helpers ──────────────────────────────────────────────────────────────────
type RiskLevel = 'high' | 'medium' | 'stable';

function computeRisk(patient: Patient): { level: RiskLevel; reasons: string[]; adherence: number } {
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = patient.doseLogs.filter((l: any) => l.date === today);
  const taken = todayLogs.filter((l: any) => l.status === 'taken').length;
  const total = patient.medicines.reduce((acc, m) => acc + (m.times?.length || 1), 0);
  const adherence = total > 0 ? Math.round((taken / total) * 100) : 100;
  const missed = todayLogs.filter((l: any) => l.status === 'missed').length;
  const latestSymptom = patient.symptomLogs[patient.symptomLogs.length - 1];
  const reasons: string[] = [];

  if (latestSymptom?.riskLevel === 'high' || adherence < 40) {
    if (missed > 0) reasons.push(`Missed ${missed} dose${missed > 1 ? 's' : ''} today`);
    if (latestSymptom?.riskLevel === 'high') reasons.push('High-risk symptoms reported');
    if (adherence < 40) reasons.push(`Adherence critically low (${adherence}%)`);
    return { level: 'high', reasons, adherence };
  }
  if (adherence < 80 || missed > 0 || (latestSymptom?.riskLevel as string) === 'medium') {
    if (missed > 0) reasons.push(`Missed ${missed} dose${missed > 1 ? 's' : ''} today`);
    if (latestSymptom?.severity && latestSymptom.severity > 3) reasons.push('Moderate symptoms present');
    return { level: 'medium', reasons, adherence };
  }
  return { level: 'stable', reasons: ['All doses taken on time', 'No concerning symptoms'], adherence };
}

const RISK_CONFIG = {
  high:   { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: '🔴 HIGH RISK' },
  medium: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: '🟡 NEEDS ATTENTION' },
  stable: { color: '#16a34a', bg: '#f0fdf4', border: '#86efac', label: '🟢 STABLE' },
};

// ─── Section Wrapper ──────────────────────────────────────────────────────────
function Section({ icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}><Feather name={icon} size={15} color={PURPLE} /></View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { linkedPatients } = useApp();
  const insets = useSafeAreaInsets();

  const patient = linkedPatients.find(p => p.id === id) ?? linkedPatients[0];

  const { level, reasons, adherence } = useMemo(() => computeRisk(patient), [patient]);
  const riskCfg = RISK_CONFIG[level];

  const today = new Date().toISOString().split('T')[0];
  const todayLogs = patient.doseLogs.filter((l: any) => l.date === today);
  const taken  = todayLogs.filter((l: any) => l.status === 'taken').length;
  const missed = todayLogs.filter((l: any) => l.status === 'missed').length;
  const total  = patient.medicines.reduce((acc, m) => acc + (m.times?.length || 1), 0);
  const pending = total - taken - missed;

  // Build timeline from all scheduled times
  const timeline = patient.medicines.flatMap(m =>
    (m.times || ['08:00']).map(time => {
      const log = todayLogs.find((l: any) => l.medicineId === m.id && l.scheduledTime === time);
      const status = log?.status || (time < new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) ? 'missed' : 'pending');
      return { time, name: m.name, dosage: m.dosage, status, color: m.color };
    })
  ).sort((a, b) => a.time.localeCompare(b.time));

  const handleCall = () => {
    const phone = patient.emergencyContact.match(/\+?[\d\s\-()]+/)?.[0]?.replace(/\s/g, '') || '';
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert('No phone number', patient.emergencyContact);
  };

  if (!patient) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Patient not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#4B26C8', PURPLE]} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.avatarLg}>
            <Text style={styles.avatarLgText}>{patient.name.split(' ').map(n => n[0]).join('')}</Text>
          </View>
          <View>
            <Text style={styles.headerName}>{patient.name}</Text>
            <Text style={styles.headerSub}>{patient.condition} · Age {patient.age}</Text>
          </View>
        </View>
        <View style={[styles.riskBanner, { backgroundColor: riskCfg.bg, borderColor: riskCfg.border }]}>
          <Text style={[styles.riskBannerText, { color: riskCfg.color }]}>{riskCfg.label}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* A. Today's Status */}
        <Section icon="activity" title="Today's Status">
          <View style={styles.statusRow}>
            <View style={[styles.statusBox, { backgroundColor: '#f0fdf4' }]}>
              <Feather name="check-circle" size={22} color="#16a34a" />
              <Text style={[styles.statusNum, { color: '#16a34a' }]}>{taken}</Text>
              <Text style={styles.statusLbl}>Taken</Text>
            </View>
            <View style={[styles.statusBox, { backgroundColor: '#fef2f2' }]}>
              <Feather name="x-circle" size={22} color="#ef4444" />
              <Text style={[styles.statusNum, { color: '#ef4444' }]}>{missed}</Text>
              <Text style={styles.statusLbl}>Missed</Text>
            </View>
            <View style={[styles.statusBox, { backgroundColor: '#f8fafc' }]}>
              <Feather name="clock" size={22} color="#64748b" />
              <Text style={[styles.statusNum, { color: '#64748b' }]}>{pending}</Text>
              <Text style={styles.statusLbl}>Pending</Text>
            </View>
          </View>
        </Section>

        {/* B. Medication Timeline */}
        <Section icon="list" title="Medication Timeline">
          {timeline.map((item, i) => {
            const statusConfig: Record<string, any> = {
              taken:   { icon: 'check-circle', color: '#16a34a', bg: '#f0fdf4', label: 'Taken' },
              missed:  { icon: 'x-circle',     color: '#ef4444', bg: '#fef2f2', label: 'Missed' },
              pending: { icon: 'clock',        color: '#64748b', bg: '#f8fafc', label: 'Pending' },
              snoozed: { icon: 'bell-off',     color: '#f59e0b', bg: '#fffbeb', label: 'Snoozed' },
            };
            const cfg = statusConfig[item.status] || { icon: 'clock', color: '#64748b', bg: '#f8fafc', label: item.status };
            return (
              <View key={i} style={styles.timelineRow}>
                <Text style={styles.timelineTime}>{item.time}</Text>
                <View style={[styles.timelineDot, { backgroundColor: item.color + '30', borderColor: item.color }]}>
                  <Feather name={cfg.icon as any} size={14} color={cfg.color} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineName}>{item.name} {item.dosage ? `(${item.dosage})` : ''}</Text>
                  <Text style={[styles.timelineStatus, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
            );
          })}
          {timeline.length === 0 && <Text style={styles.emptyNote}>No scheduled doses yet.</Text>}
        </Section>

        {/* C. Recovery Trends */}
        <Section icon="trending-up" title="Recovery Trends">
          {patient.symptomLogs.length === 0 ? (
            <Text style={styles.emptyNote}>No symptom data yet.</Text>
          ) : (
            patient.symptomLogs.slice(-3).reverse().map((log, i) => (
              <View key={i} style={styles.trendCard}>
                <View style={styles.trendCardTop}>
                  <Text style={styles.trendDate}>{new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                  <View style={[styles.severityPill, { backgroundColor: log.severity > 5 ? '#fef2f2' : '#f0fdf4' }]}>
                    <Text style={[styles.severityText, { color: log.severity > 5 ? '#ef4444' : '#16a34a' }]}>Severity: {log.severity}/10</Text>
                  </View>
                </View>
                {log.symptoms.length > 0 && <Text style={styles.trendSymptoms}>Symptoms: {log.symptoms.join(', ')}</Text>}
                {log.notes && <Text style={styles.trendNotes}>"{log.notes}"</Text>}
              </View>
            ))
          )}
          {patient.symptomLogs.length > 1 && (() => {
            const latest = patient.symptomLogs[patient.symptomLogs.length - 1];
            const prev   = patient.symptomLogs[patient.symptomLogs.length - 2];
            if (latest.severity < prev.severity) return <Text style={styles.insightGood}>✨ Symptoms improving steadily</Text>;
            if (latest.severity > prev.severity) return <Text style={styles.insightBad}>⚠️ Symptom severity increasing — monitor closely</Text>;
            return <Text style={styles.insightNeutral}>➡️ Symptoms stable, no change</Text>;
          })()}
        </Section>

        {/* D. Risk Analysis */}
        <Section icon="shield" title="Risk Analysis">
          <View style={[styles.riskCard, { backgroundColor: riskCfg.bg, borderColor: riskCfg.border }]}>
            <Text style={[styles.riskLabel, { color: riskCfg.color }]}>{riskCfg.label}</Text>
            <Text style={styles.riskReasonTitle}>Reasons:</Text>
            {reasons.map((r, i) => <Text key={i} style={[styles.riskReason, { color: riskCfg.color }]}>• {r}</Text>)}
          </View>
        </Section>

        {/* E. Current Plan Info */}
        <Section icon="file-text" title="Current Plan">
          <View style={styles.planInfoRow}>
            <View style={styles.planInfoItem}>
              <Feather name="package" size={16} color={PURPLE} />
              <Text style={styles.planInfoVal}>{patient.medicines.length}</Text>
              <Text style={styles.planInfoLbl}>Medicines</Text>
            </View>
            <View style={styles.planInfoItem}>
              <Feather name="calendar" size={16} color={PURPLE} />
              <Text style={styles.planInfoVal}>{adherence}%</Text>
              <Text style={styles.planInfoLbl}>Adherence</Text>
            </View>
            <View style={styles.planInfoItem}>
              <Feather name="user" size={16} color={PURPLE} />
              <Text style={styles.planInfoVal} numberOfLines={1}>{patient.emergencyContact.split(' ')[0]}</Text>
              <Text style={styles.planInfoLbl}>Emergency</Text>
            </View>
          </View>
          {patient.followUps.length > 0 && (
            <View style={styles.followUpCard}>
              <Feather name="calendar" size={14} color={PURPLE} />
              <View style={{ flex: 1 }}>
                <Text style={styles.followUpTitle}>{patient.followUps[0].title}</Text>
                <Text style={styles.followUpDate}>{new Date(patient.followUps[0].dateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
              </View>
            </View>
          )}
        </Section>

        {/* F. Action Panel */}
        <Section icon="zap" title="Actions">
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/caregiver/remind' as any)}>
              <View style={[styles.actionBtnIcon, { backgroundColor: '#EDE9FE' }]}>
                <Feather name="bell" size={20} color={PURPLE} />
              </View>
              <Text style={styles.actionBtnText}>Send Reminder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
              <View style={[styles.actionBtnIcon, { backgroundColor: '#f0fdf4' }]}>
                <Feather name="phone" size={20} color="#16a34a" />
              </View>
              <Text style={styles.actionBtnText}>Call Contact</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/caregiver/message' as any)}>
              <View style={[styles.actionBtnIcon, { backgroundColor: '#fffbeb' }]}>
                <Feather name="message-circle" size={20} color="#f59e0b" />
              </View>
              <Text style={styles.actionBtnText}>Send Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/caregiver/create-plan' as any)}>
              <View style={[styles.actionBtnIcon, { backgroundColor: '#f0fdf4' }]}>
                <Feather name="file-plus" size={20} color="#16a34a" />
              </View>
              <Text style={styles.actionBtnText}>New Plan</Text>
            </TouchableOpacity>
          </View>
        </Section>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F4FB' },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  backBtn: { marginBottom: 14 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatarLg: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarLgText: { fontSize: 20, fontFamily: 'Inter_700Bold', color: WHITE },
  headerName: { fontSize: 20, fontFamily: 'Inter_700Bold', color: WHITE },
  headerSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  riskBanner: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, alignSelf: 'flex-start' },
  riskBannerText: { fontSize: 13, fontFamily: 'Inter_700Bold' },

  // Section
  section: { backgroundColor: WHITE, borderRadius: 20, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#1e1b4b' },

  // Status
  statusRow: { flexDirection: 'row', gap: 10 },
  statusBox: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 16, gap: 4 },
  statusNum: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  statusLbl: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#64748b' },

  // Timeline
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  timelineTime: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#64748b', width: 44 },
  timelineDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  timelineContent: { flex: 1 },
  timelineName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#1e1b4b' },
  timelineStatus: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  emptyNote: { fontSize: 13, color: '#94a3b8', fontFamily: 'Inter_400Regular', textAlign: 'center', paddingVertical: 8 },

  // Trends
  trendCard: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, marginBottom: 10 },
  trendCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  trendDate: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#64748b' },
  severityPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  severityText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  trendSymptoms: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#1e1b4b' },
  trendNotes: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#64748b', fontStyle: 'italic', marginTop: 4 },
  insightGood: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#16a34a', marginTop: 4 },
  insightBad: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#ef4444', marginTop: 4 },
  insightNeutral: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#64748b', marginTop: 4 },

  // Risk
  riskCard: { borderRadius: 14, padding: 14, borderWidth: 1 },
  riskLabel: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  riskReasonTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#64748b', marginBottom: 4 },
  riskReason: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 2 },

  // Plan info
  planInfoRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  planInfoItem: { flex: 1, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, gap: 4 },
  planInfoVal: { fontSize: 18, fontFamily: 'Inter_700Bold', color: PURPLE },
  planInfoLbl: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#64748b' },
  followUpCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EDE9FE', borderRadius: 14, padding: 12 },
  followUpTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#1e1b4b' },
  followUpDate: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#64748b', marginTop: 2 },

  // Actions
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { width: '47%', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, paddingVertical: 16, gap: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  actionBtnIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#1e1b4b' },
});
