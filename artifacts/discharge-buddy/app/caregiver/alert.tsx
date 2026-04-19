import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AlertPage() {
  const { linkedPatients } = useApp();
  const insets = useSafeAreaInsets();
  const patient = linkedPatients[0];

  const triggerAlert = (level: 'High' | 'Emergency') => {
    Alert.alert(
      `${level} Alert Triggered`,
      `The ${level.toLowerCase()} alert has been sent to ${patient?.name} and relevant emergency contacts.`,
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  if (!patient) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#EF4444', '#B91C1C']}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Alert</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.warningBox}>
          <Feather name="alert-octagon" size={32} color="#EF4444" />
          <Text style={styles.warningTitle}>Critical Actions</Text>
          <Text style={styles.warningDesc}>
            Use these actions only in case of emergency or high-risk situations.
          </Text>
        </View>

        <TouchableOpacity style={styles.alertBtn} onPress={() => triggerAlert('High')}>
            <View style={[styles.btnIcon, { backgroundColor: '#FEE2E2' }]}>
                <Feather name="alert-circle" size={24} color="#EF4444" />
            </View>
            <View style={styles.btnBody}>
                <Text style={styles.btnTitle}>High Risk Alert</Text>
                <Text style={styles.btnDesc}>Notify patient of high-risk symptoms detected.</Text>
            </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.alertBtn, styles.emergencyBtn]} onPress={() => triggerAlert('Emergency')}>
            <View style={[styles.btnIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Feather name="phone-call" size={24} color="#fff" />
            </View>
            <View style={styles.btnBody}>
                <Text style={[styles.btnTitle, { color: '#fff' }]}>Trigger Emergency</Text>
                <Text style={[styles.btnDesc, { color: 'rgba(255,255,255,0.8)' }]}>Call emergency services and notify family.</Text>
            </View>
        </TouchableOpacity>

        <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>Patient Emergency Contact</Text>
            <View style={styles.contactCard}>
                <Feather name="phone" size={20} color="#4B5563" />
                <Text style={styles.contactText}>{patient.emergencyContact}</Text>
            </View>
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
  warningBox: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 25, padding: 20, marginBottom: 25, borderBottomWidth: 4, borderBottomColor: '#FEE2E2' },
  warningTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E1B4B', marginTop: 10 },
  warningDesc: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 5 },
  alertBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  emergencyBtn: { backgroundColor: '#EF4444' },
  btnIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  btnBody: { flex: 1 },
  btnTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E1B4B' },
  btnDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  contactSection: { marginTop: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#6B7280', marginBottom: 10 },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 15, padding: 15 },
  contactText: { fontSize: 14, color: '#1E1B4B', fontWeight: '500' },
});
