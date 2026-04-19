import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RemindPage() {
  const { linkedPatients } = useApp();
  const insets = useSafeAreaInsets();
  const patient = linkedPatients[0];
  const [sent, setSent] = useState<string[]>([]);

  const sendReminder = (type: string) => {
    // Mock sending reminder
    Alert.alert("Reminder Sent", `A ${type} reminder has been sent to ${patient?.name}.`);
    setSent([...sent, type]);
  };

  if (!patient) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F59E0B', '#D97706']}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Reminder</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Quickly nudge {patient.name} to stay on track with their recovery.
        </Text>

        <ReminderCard
          icon="pill"
          title="Medicine Reminder"
          description="Remind them to take their upcoming dose."
          onPress={() => sendReminder('Medicine')}
          isSent={sent.includes('Medicine')}
        />

        <ReminderCard
          icon="activity"
          title="Symptom Check"
          description="Ask how they are feeling right now."
          onPress={() => sendReminder('Symptom')}
          isSent={sent.includes('Symptom')}
        />

        <ReminderCard
          icon="droplet"
          title="Hydration"
          description="A quick nudge to drink some water."
          onPress={() => sendReminder('Hydration')}
          isSent={sent.includes('Hydration')}
        />

        <ReminderCard
          icon="smile"
          title="Check-in"
          description="Just saying hi and checking in."
          onPress={() => sendReminder('Check-in')}
          isSent={sent.includes('Check-in')}
        />
      </ScrollView>
    </View>
  );
}

function ReminderCard({ icon, title, description, onPress, isSent }: any) {
  return (
    <TouchableOpacity 
      style={[styles.card, isSent && styles.cardSent]} 
      onPress={onPress}
      disabled={isSent}
    >
      <View style={styles.cardIcon}>
        <Feather name={icon} size={24} color="#D97706" />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{description}</Text>
      </View>
      <View style={styles.cardAction}>
        {isSent ? (
          <Feather name="check-circle" size={20} color="#16A34A" />
        ) : (
          <Feather name="send" size={20} color="#D97706" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F4FB' },
  header: { paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { padding: 20 },
  description: { fontSize: 14, color: '#6B7280', marginBottom: 20, textAlign: 'center' },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 
  },
  cardSent: { opacity: 0.7, backgroundColor: '#F9FAFB' },
  cardIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E1B4B' },
  cardDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cardAction: { marginLeft: 10 },
});
