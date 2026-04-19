import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MonitorPage() {
  const { linkedPatients } = useApp();
  const insets = useSafeAreaInsets();
  const patient = linkedPatients[0];

  if (!patient) {
    return (
      <View style={styles.container}>
        <Text>No patient linked.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4B26C8', '#6C47FF']}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Monitoring: {patient.name}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adherence Overview</Text>
          <View style={styles.card}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>98%</Text>
                <Text style={styles.statLabel}>Weekly</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statItem}>
                <Text style={styles.statVal}>100%</Text>
                <Text style={styles.statLabel}>Today</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Symptoms</Text>
          {patient.symptomLogs.map((log) => (
            <View key={log.id} style={styles.card}>
              <View style={styles.logHeader}>
                <Text style={styles.logDate}>{new Date(log.date).toLocaleDateString()}</Text>
                <View style={[styles.badge, { backgroundColor: log.riskLevel === 'low' ? '#DCFCE7' : '#FEE2E2' }]}>
                  <Text style={[styles.badgeText, { color: log.riskLevel === 'low' ? '#16A34A' : '#EF4444' }]}>
                    {log.riskLevel.toUpperCase()} RISK
                  </Text>
                </View>
              </View>
              <Text style={styles.logText}>Symptoms: {log.symptoms.join(', ')}</Text>
              <Text style={styles.logNotes}>{log.notes}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medication Schedule</Text>
          {patient.medicines.map((med) => (
            <View key={med.id} style={styles.medRow}>
              <View style={[styles.medIcon, { backgroundColor: med.color + '20' }]}>
                <Feather name="package" size={20} color={med.color} />
              </View>
              <View style={styles.medInfo}>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medSub}>{med.dosage} · {med.frequency}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F4FB' },
  header: { paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { padding: 20 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E1B4B', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 10 },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: 'bold', color: '#4B26C8' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  divider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logDate: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  logText: { fontSize: 14, color: '#1E1B4B', fontWeight: '500' },
  logNotes: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  medRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, padding: 12, marginBottom: 8 },
  medIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  medInfo: { flex: 1 },
  medName: { fontSize: 14, fontWeight: 'bold', color: '#1E1B4B' },
  medSub: { fontSize: 11, color: '#6B7280' },
});
