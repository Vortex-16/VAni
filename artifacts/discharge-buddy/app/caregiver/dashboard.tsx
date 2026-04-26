import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useSidebar } from '@/context/SidebarContext';
import type { Patient } from '@/context/AppContext';

const PURPLE = '#6C47FF';
const WHITE = '#FFFFFF';

// ─── Risk Engine ──────────────────────────────────────────────────────────────
type RiskLevel = 'high' | 'medium' | 'stable';

function computeRisk(patient: Patient): { level: RiskLevel; reasons: string[] } {
  const reasons: string[] = [];
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = patient.doseLogs.filter((l: any) => l.date === today);
  const taken = todayLogs.filter((l: any) => l.status === 'taken').length;
  const total = patient.medicines.reduce((acc, m) => acc + (m.times?.length || 1), 0);
  const adherence = total > 0 ? (taken / total) * 100 : 100;

  const latestSymptom = patient.symptomLogs[patient.symptomLogs.length - 1];
  const missed = todayLogs.filter((l: any) => l.status === 'missed').length;

  if (latestSymptom?.riskLevel === 'high' || adherence < 40) {
    if (missed > 0) reasons.push(`Missed ${missed} dose${missed > 1 ? 's' : ''} today`);
    if (latestSymptom?.riskLevel === 'high') reasons.push('High-risk symptoms reported');
    return { level: 'high', reasons };
  }
  if (adherence < 80 || missed > 0 || latestSymptom?.riskLevel === 'medium') {
    if (missed > 0) reasons.push(`Missed ${missed} dose${missed > 1 ? 's' : ''} today`);
    if (latestSymptom?.severity && latestSymptom.severity > 3) reasons.push('Moderate symptoms reported');
    return { level: 'medium', reasons };
  }
  return { level: 'stable', reasons: ['All doses taken', 'No concerning symptoms'] };
}

function computeAdherence(patient: Patient): number {
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = patient.doseLogs.filter((l: any) => l.date === today);
  const taken = todayLogs.filter((l: any) => l.status === 'taken').length;
  const total = patient.medicines.reduce((acc, m) => acc + (m.times?.length || 1), 0);
  return total > 0 ? Math.round((taken / total) * 100) : 100;
}

function generateAlerts(patients: Patient[]): string[] {
  const alerts: string[] = [];
  const today = new Date().toISOString().split('T')[0];
  patients.forEach(p => {
    const todayLogs = p.doseLogs.filter((l: any) => l.date === today);
    const missed = todayLogs.filter((l: any) => l.status === 'missed').length;
    if (missed >= 2) alerts.push(`⚠️ ${p.name} missed ${missed} doses today`);
    else if (missed === 1) alerts.push(`⚠️ ${p.name} missed 1 dose today`);
    if (todayLogs.length === 0 && p.medicines.length > 0) alerts.push(`📵 No activity logged for ${p.name} today`);
    const latest = p.symptomLogs[p.symptomLogs.length - 1];
    if (latest?.riskLevel === 'high') alerts.push(`🚨 ${p.name} reported high-risk symptoms`);
    const upcoming = p.followUps.find(f => {
      const hoursLeft = (new Date(f.dateTime).getTime() - Date.now()) / 3600000;
      return hoursLeft > 0 && hoursLeft < 24 && !f.completed;
    });
    if (upcoming) alerts.push(`📅 ${p.name} has a follow-up in <24h: ${upcoming.title}`);
  });
  return alerts;
}

// ─── Risk Badge ────────────────────────────────────────────────────────────────
function RiskBadge({ level }: { level: RiskLevel }) {
  const config = {
    high:   { bg: '#fef2f2', text: '#ef4444', label: '🔴 HIGH RISK', border: '#fecaca' },
    medium: { bg: '#fffbeb', text: '#f59e0b', label: '🟡 ATTENTION', border: '#fde68a' },
    stable: { bg: '#f0fdf4', text: '#16a34a', label: '🟢 STABLE',    border: '#86efac' },
  }[level];
  return (
    <View style={[styles.riskBadge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Text style={[styles.riskBadgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

// ─── Patient Priority Card ────────────────────────────────────────────────────
function PatientCard({ patient }: { patient: Patient }) {
  const { level, reasons } = computeRisk(patient);
  const adherence = computeAdherence(patient);
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = patient.doseLogs.filter((l: any) => l.date === today);
  const taken = todayLogs.filter((l: any) => l.status === 'taken').length;
  const total = patient.medicines.reduce((acc, m) => acc + (m.times?.length || 1), 0);
  const lastActivity = todayLogs.length > 0
    ? new Date(Math.max(...todayLogs.map((l: any) => new Date(l.takenAt || l.date).getTime()))).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'No activity today';

  const borderColor = level === 'high' ? '#fecaca' : level === 'medium' ? '#fde68a' : '#86efac';

  return (
    <TouchableOpacity
      style={[styles.patientCard, { borderLeftColor: borderColor }]}
      onPress={() => router.push({ pathname: '/caregiver/patient-detail', params: { id: patient.id } } as any)}
      activeOpacity={0.85}
    >
      <View style={styles.patientCardTop}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{patient.name.split(' ').map(n => n[0]).join('')}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.patientName}>{patient.name}</Text>
          <Text style={styles.patientCondition}>{patient.condition}</Text>
        </View>
        <RiskBadge level={level} />
      </View>

      <View style={styles.patientCardStats}>
        <View style={styles.miniStat}>
          <Feather name="check-circle" size={13} color="#16a34a" />
          <Text style={styles.miniStatText}>{taken}/{total} doses today</Text>
        </View>
        <View style={styles.miniStat}>
          <Feather name="clock" size={13} color="#64748b" />
          <Text style={styles.miniStatText}>{lastActivity}</Text>
        </View>
        <View style={styles.miniStat}>
          <Feather name="trending-up" size={13} color={PURPLE} />
          <Text style={styles.miniStatText}>{adherence}% adherence</Text>
        </View>
      </View>

      {level !== 'stable' && reasons.length > 0 && (
        <View style={styles.reasonRow}>
          {reasons.map((r, i) => (
            <Text key={i} style={styles.reasonText}>• {r}</Text>
          ))}
        </View>
      )}

      <View style={styles.patientCardActions}>
        <TouchableOpacity style={styles.actionChip} onPress={() => router.push('/caregiver/remind' as any)}>
          <Feather name="bell" size={12} color={PURPLE} />
          <Text style={styles.actionChipText}>Remind</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionChip} onPress={() => {
          const phone = patient.emergencyContact.match(/\+?[\d\s\-()]+/)?.[0]?.replace(/\s/g, '') || '';
          if (phone) Linking.openURL(`tel:${phone}`);
          else Alert.alert('No phone', 'No phone number found in emergency contact.');
        }}>
          <Feather name="phone" size={12} color="#16a34a" />
          <Text style={[styles.actionChipText, { color: '#16a34a' }]}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionChip} onPress={() => router.push('/caregiver/message' as any)}>
          <Feather name="message-circle" size={12} color="#f59e0b" />
          <Text style={[styles.actionChipText, { color: '#f59e0b' }]}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionChip, { backgroundColor: '#EDE9FE' }]} onPress={() => router.push('/caregiver/patient-detail' as any)}>
          <Feather name="chevron-right" size={12} color={PURPLE} />
          <Text style={styles.actionChipText}>Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function CaregiverDashboard() {
  const { linkedPatients, user, refreshData } = useApp();
  const { open: openSidebar } = useSidebar();
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    // Poll for real-time patient updates every 5 seconds
    const interval = setInterval(() => {
      refreshData().catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const sorted = useMemo(() => {
    return [...linkedPatients].sort((a, b) => {
      const order: Record<RiskLevel, number> = { high: 0, medium: 1, stable: 2 };
      return order[computeRisk(a).level] - order[computeRisk(b).level];
    });
  }, [linkedPatients]);

  const alerts = useMemo(() => generateAlerts(linkedPatients), [linkedPatients]);
  const highCount = sorted.filter(p => computeRisk(p).level === 'high').length;
  const medCount  = sorted.filter(p => computeRisk(p).level === 'medium').length;
  const stableCount = sorted.filter(p => computeRisk(p).level === 'stable').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#4B26C8', PURPLE]} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {/* Header Top Bar */}
        <View style={styles.headerTopBar}>
          <TouchableOpacity onPress={openSidebar} style={styles.headerIconBtn}>
            <Feather name="menu" size={22} color={WHITE} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => router.push('/settings' as any)} style={styles.headerIconBtn}>
            <Feather name="settings" size={20} color={WHITE} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerGreeting}>Care Control Center</Text>
            <Text style={styles.headerSub}>Welcome, {user?.name?.split(' ')[0] || 'Caregiver'}</Text>
          </View>
          <TouchableOpacity style={styles.newPlanBtn} onPress={() => router.push('/caregiver/create-plan' as any)}>
            <Feather name="plus" size={16} color={WHITE} />
            <Text style={styles.newPlanText}>New Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Global Overview */}
        <View style={styles.overviewRow}>
          <View style={styles.overviewStat}>
            <Text style={styles.overviewVal}>{linkedPatients.length}</Text>
            <Text style={styles.overviewLabel}>Total</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewStat}>
            <Text style={[styles.overviewVal, { color: '#fca5a5' }]}>{highCount}</Text>
            <Text style={styles.overviewLabel}>🔴 High Risk</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewStat}>
            <Text style={[styles.overviewVal, { color: '#fde68a' }]}>{medCount}</Text>
            <Text style={styles.overviewLabel}>🟡 Attention</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewStat}>
            <Text style={[styles.overviewVal, { color: '#86efac' }]}>{stableCount}</Text>
            <Text style={styles.overviewLabel}>🟢 Stable</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Smart Alerts */}
        {alerts.length > 0 && (
          <View style={styles.alertsCard}>
            <View style={styles.alertsHeader}>
              <Feather name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.alertsTitle}>Smart Alerts</Text>
              <View style={styles.alertsBadge}><Text style={styles.alertsBadgeText}>{alerts.length}</Text></View>
            </View>
            {alerts.map((a, i) => (
              <Text key={i} style={styles.alertItem}>{a}</Text>
            ))}
          </View>
        )}

        {/* Priority Patient List */}
        <View style={styles.sectionHeader}>
          <Feather name="users" size={16} color={PURPLE} />
          <Text style={styles.sectionTitle}>Priority Patient List</Text>
        </View>

        {sorted.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="user-plus" size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>No patients linked yet.</Text>
            <Text style={styles.emptySubText}>Issue a discharge plan to link a patient.</Text>
          </View>
        ) : (
          sorted.map(p => <PatientCard key={p.id} patient={p} />)
        )}

        {/* QR Plan Management */}
        <View style={styles.sectionHeader}>
          <Feather name="maximize" size={16} color={PURPLE} />
          <Text style={styles.sectionTitle}>Plan Management</Text>
        </View>
        <TouchableOpacity style={styles.planMgmtCard} onPress={() => router.push('/caregiver/create-plan' as any)}>
          <View style={styles.planMgmtLeft}>
            <View style={styles.planMgmtIcon}><Feather name="file-plus" size={22} color={PURPLE} /></View>
            <View>
              <Text style={styles.planMgmtTitle}>Create Discharge Plan</Text>
              <Text style={styles.planMgmtSub}>Generate QR for patient to import</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F4FB' },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTopBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  headerIconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerGreeting: { fontSize: 20, fontFamily: 'Inter_700Bold', color: WHITE },
  headerSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  newPlanBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  newPlanText: { color: WHITE, fontFamily: 'Inter_600SemiBold', fontSize: 13 },

  // Global overview
  overviewRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 14 },
  overviewStat: { flex: 1, alignItems: 'center' },
  overviewVal: { fontSize: 22, fontFamily: 'Inter_700Bold', color: WHITE },
  overviewLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.8)', marginTop: 2, textAlign: 'center' },
  overviewDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.3)' },

  // Alerts
  alertsCard: { backgroundColor: '#fef2f2', borderRadius: 18, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#fecaca' },
  alertsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  alertsTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#1e1b4b', flex: 1 },
  alertsBadge: { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  alertsBadgeText: { color: WHITE, fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  alertItem: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#7f1d1d', paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#fecaca' },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#1e1b4b' },

  // Patient card
  patientCard: { backgroundColor: WHITE, borderRadius: 20, padding: 16, marginBottom: 14, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  patientCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: PURPLE },
  patientName: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#1e1b4b' },
  patientCondition: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#64748b', marginTop: 2 },

  // Risk badge
  riskBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  riskBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold' },

  // Mini stats row
  patientCardStats: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniStatText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#64748b' },

  // Reason row
  reasonRow: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 8, marginBottom: 10 },
  reasonText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#b91c1c' },

  // Action chips
  patientCardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  actionChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: PURPLE },

  // Plan management
  planMgmtCard: { backgroundColor: WHITE, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  planMgmtLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  planMgmtIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  planMgmtTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#1e1b4b' },
  planMgmtSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#64748b', marginTop: 2 },

  // Empty
  emptyCard: { backgroundColor: WHITE, borderRadius: 20, padding: 32, alignItems: 'center', marginBottom: 14 },
  emptyText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#94a3b8', marginTop: 12 },
  emptySubText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#cbd5e1', textAlign: 'center', marginTop: 4 },
});
