import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Dimensions, ActivityIndicator, Alert,
  StatusBar, Platform, Image, Linking
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import type { Patient } from '@/context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const PURPLE = '#6C47FF';
const PURPLE_LIGHT = '#EDE9FE';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';

// ── Quick Action icons ──────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { icon: 'file-text', label: 'Upload\nPrescription', color: PURPLE,    bg: '#F5F3FF', route: '/scan' },
  { icon: 'shopping-bag',label: 'Order\nMedicines',   color: '#3B82F6', bg: '#EFF6FF', route: 'https://pharmacy.amazon.com' },
  { icon: 'calendar',  label: 'Book\nFollow-up',      color: '#8B5CF6', bg: '#F5F3FF', route: '/family/book-appointment' },
  { icon: 'activity',  label: 'Health\nRecords',      color: '#EC4899', bg: '#FDF2F8', route: '/(tabs)' },
];

// ── Add Member Modal ─────────────────────────────────────────────────────────
function AddMemberModal({
  visible, onClose, onAdd, onLink, loading,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: any) => Promise<void>;
  onLink: (email: string) => Promise<void>;
  loading: boolean;
}) {
  const [tab, setTab] = useState<'manual' | 'link'>('manual');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [condition, setCondition] = useState('');
  const [email, setEmail] = useState('');

  const reset = () => { setName(''); setAge(''); setCondition(''); setEmail(''); };

  const handleSubmit = async () => {
    if (tab === 'manual') {
      if (!name.trim()) { Alert.alert('Required', 'Please enter a name.'); return; }
      await onAdd({ name: name.trim(), age, condition: condition.trim() });
    } else {
      if (!email.trim()) { Alert.alert('Required', 'Please enter an email address.'); return; }
      await onLink(email.trim());
    }
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Add Family Member</Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }} style={styles.sheetClose}>
              <Feather name="x" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabRow}>
            {(['manual', 'link'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.tabActive]}
                onPress={() => setTab(t)}
              >
                <Feather name={t === 'manual' ? 'user-plus' : 'link'} size={13} color={tab === t ? '#fff' : TEXT_MUTED} />
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'manual' ? 'Create Profile' : 'Link Account'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'manual' ? (
            <>
              <Text style={styles.fieldLabel}>Full Name *</Text>
              <TextInput style={styles.field} placeholder="e.g. Rajesh Kumar" value={name} onChangeText={setName} placeholderTextColor={TEXT_MUTED} />
              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput style={styles.field} placeholder="e.g. 62" value={age} onChangeText={setAge} keyboardType="numeric" placeholderTextColor={TEXT_MUTED} />
              <Text style={styles.fieldLabel}>Condition / Notes</Text>
              <TextInput style={styles.field} placeholder="e.g. Diabetes, Hypertension" value={condition} onChangeText={setCondition} placeholderTextColor={TEXT_MUTED} />
            </>
          ) : (
            <>
              <View style={styles.linkNote}>
                <Feather name="info" size={13} color={PURPLE} />
                <Text style={styles.linkNoteText}>
                  Enter the email address the family member used to register on Discharge Buddy.
                </Text>
              </View>
              <Text style={styles.fieldLabel}>Patient's Email *</Text>
              <TextInput style={styles.field} placeholder="patient@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={TEXT_MUTED} />
            </>
          )}

          <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.submitBtnText}>{tab === 'manual' ? '+ Add Member' : 'Link Account'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function FamilyDashboard() {
  const insets = useSafeAreaInsets();
  const {
    user, familyMembers, addFamilyMember, linkFamilyMember,
    setActivePatientId, activePatientId, logout, speakNeural, isOnboarded
  } = useApp();

  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  if (!isOnboarded) {
    import('expo-router').then(m => m.router.replace('/onboarding'));
    return null;
  }

  if (!user) {
    import('expo-router').then(m => m.router.replace('/login'));
    return null;
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning,';
    if (h < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  })();

  const handleSelectMember = (member: Patient | null) => {
    if (member) {
      setActivePatientId(member.id);
      router.push('/(tabs)');
    } else {
      // You / Self
      setActivePatientId(null); // Assuming null activePatientId goes to current user's profile if we wanted, or we could redirect to a specific self profile.
      // For now, let's keep the user on dashboard or show a toast.
    }
  };

  const handleAdd = async (data: any) => {
    setActionLoading(true);
    try { await addFamilyMember(data); }
    catch (e: any) { Alert.alert('Error', e.message || 'Failed to add member.'); }
    finally { setActionLoading(false); setModalVisible(false); }
  };

  const handleLink = async (email: string) => {
    setActionLoading(true);
    try { await linkFamilyMember(email); }
    catch (e: any) { Alert.alert('Not Found', e.message || 'No patient found with this email.'); }
    finally { setActionLoading(false); setModalVisible(false); }
  };

  // Compute overall stats for Medication Summary
  let totalDoses = 0;
  let completedDoses = 0;
  let pendingDoses = 0;
  let upcomingDoses = 0;

  familyMembers.forEach(m => {
    if (m.doseLogs) {
      totalDoses += m.doseLogs.length;
      completedDoses += m.doseLogs.filter(d => d.status === 'taken').length;
      pendingDoses += m.doseLogs.filter(d => d.status === 'pending' || d.status === 'missed').length; // Treating missed as pending for simplicity here if needed, or separate it.
      // If we had a way to distinguish upcoming, we could count them. For now let's just make it up or base it on time.
      upcomingDoses += m.doseLogs.filter(d => d.status === 'snoozed').length; // Placeholder logic
    }
  });

  const progressPct = totalDoses > 0 ? (completedDoses / totalDoses) * 100 : 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Top App Bar ── */}
      <View style={[styles.appBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.iconBtn}>
          <Feather name="menu" size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <View style={styles.appBarRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Feather name="bell" size={22} color={TEXT_DARK} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBtn} onPress={logout}>
             {/* Use a default avatar or user's photo */}
            <View style={styles.avatarSmall}>
               <Text style={styles.avatarSmallText}>{user?.name?.charAt(0) || 'U'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting ── */}
        <View style={styles.greetingHeader}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
             <Text style={styles.userName}>{user?.name ?? 'Anjali Sharma'}</Text>
             <Text style={{ fontSize: 24 }}> 👋</Text>
          </View>
          <Text style={styles.subtitle}>Take care of your family's health 💜</Text>
        </View>

        {/* ── Family Members Section ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Family Members</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.familyScroll}>
          {familyMembers.map((m, i) => (
             <TouchableOpacity key={m.id} style={styles.familyItem} onPress={() => handleSelectMember(m)}>
                <View style={styles.familyAvatarContainer}>
                   <View style={[styles.familyAvatar, { backgroundColor: ['#E0E7FF', '#FCE7F3', '#FEF3C7', '#D1FAE5'][i % 4] }]}>
                      <Text style={styles.familyInitials}>{m.name.substring(0,2).toUpperCase()}</Text>
                   </View>
                </View>
                <Text style={styles.familyItemName} numberOfLines={1}>{m.name.split(' ')[0]}</Text>
                <Text style={styles.familyItemRelation}>{m.relation || 'Member'}</Text>
             </TouchableOpacity>
          ))}
          
          <TouchableOpacity style={styles.familyItem} onPress={() => handleSelectMember(null)}>
              <View style={styles.familyAvatarContainer}>
                 <View style={[styles.familyAvatar, { backgroundColor: '#F3F4F6' }]}>
                    <Text style={[styles.familyInitials, { color: TEXT_MUTED }]}>YOU</Text>
                 </View>
              </View>
              <Text style={styles.familyItemName}>You</Text>
              <Text style={styles.familyItemRelation}>Self</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.familyItem} onPress={() => setModalVisible(true)}>
              <View style={[styles.familyAvatarContainer, { borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed' }]}>
                 <View style={[styles.familyAvatar, { backgroundColor: '#F8FAFC' }]}>
                    <Feather name="plus" size={24} color={PURPLE} />
                 </View>
              </View>
              <Text style={[styles.familyItemName, { color: PURPLE }]}>Add</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── Today's Medication Summary ── */}
        <LinearGradient colors={['#7E57C2', '#5E35B1']} style={styles.summaryCard}>
            <View style={styles.summaryTop}>
               <View>
                  <Text style={styles.summaryTitle}>Today's Medication Summary</Text>
                  <Text style={styles.summaryCount}>{completedDoses} of {totalDoses} Completed</Text>
               </View>
               {/* Decorative pill icons would go here, omitting for pure RN components */}
            </View>
            <View style={styles.progressBarBg}>
               <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
            </View>
            <View style={styles.summaryStatsRow}>
                <View style={styles.summaryStatItem}>
                   <Feather name="clock" size={14} color="#F59E0B" />
                   <Text style={[styles.summaryStatNum, { color: '#F59E0B' }]}>{pendingDoses}</Text>
                   <Text style={styles.summaryStatLabel}>Pending</Text>
                </View>
                <View style={styles.summaryStatItem}>
                   <Feather name="check-circle" size={14} color="#10B981" />
                   <Text style={[styles.summaryStatNum, { color: '#10B981' }]}>{completedDoses}</Text>
                   <Text style={styles.summaryStatLabel}>Completed</Text>
                </View>
                <View style={styles.summaryStatItem}>
                   <Feather name="calendar" size={14} color="#8B5CF6" />
                   <Text style={[styles.summaryStatNum, { color: '#8B5CF6' }]}>{upcomingDoses}</Text>
                   <Text style={styles.summaryStatLabel}>Upcoming</Text>
                </View>
            </View>
        </LinearGradient>

        {/* ── Quick Actions ── */}
        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 16 }]}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map(({ icon, label, color, bg, route }) => (
            <TouchableOpacity
              key={label}
              style={[styles.quickCard]}
              onPress={() => {
                if (label.includes('Health')) {
                  if (!activePatientId) {
                    Alert.alert('Select a Member', 'Please select a family member from the top list to view their health records.');
                    return;
                  }
                  speakNeural("Opening health records. Please wait.");
                  router.push(route as any);
                } else if (route.startsWith('http')) {
                  Linking.openURL(route);
                } else {
                  router.push(route as any);
                }
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIconWrap, { backgroundColor: bg }]}>
                <Feather name={icon as any} size={24} color={color} />
              </View>
              <Text style={styles.quickLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Reminders & Alerts ── */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Reminders & Alerts</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.alertsContainer}>
            {/* Example Alert 1 */}
            <View style={styles.alertCard}>
               <View style={styles.alertLeft}>
                  <View style={[styles.alertAvatar, { backgroundColor: '#E0E7FF' }]}>
                     <Text style={[styles.familyInitials, { fontSize: 14 }]}>RS</Text>
                  </View>
                  <View style={styles.alertInfo}>
                     <Text style={styles.alertName}>Rajesh Sharma</Text>
                     <Text style={styles.alertDesc}>Take Metformin 500mg</Text>
                  </View>
               </View>
               <View style={styles.alertRight}>
                  <Text style={styles.alertTime}>9:00 AM</Text>
                  <Feather name="bell" size={16} color={TEXT_MUTED} style={{ marginLeft: 8 }} />
               </View>
            </View>

            {/* Example Alert 2 */}
            <View style={styles.alertCard}>
               <View style={styles.alertLeft}>
                  <View style={[styles.alertAvatar, { backgroundColor: '#FCE7F3' }]}>
                     <Text style={[styles.familyInitials, { fontSize: 14 }]}>SS</Text>
                  </View>
                  <View style={styles.alertInfo}>
                     <Text style={styles.alertName}>Sunita Sharma</Text>
                     <Text style={[styles.alertDesc, { color: '#D97706' }]}>Amlodipine 5mg is pending</Text>
                  </View>
               </View>
               <View style={styles.alertRight}>
                  <Text style={styles.alertTime}>8:30 AM</Text>
                  <Feather name="bell" size={16} color="#D97706" style={{ marginLeft: 8 }} />
               </View>
            </View>
        </View>

      </ScrollView>

      <AddMemberModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAdd}
        onLink={handleLink}
        loading={actionLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },

  // App Bar
  appBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 10,
    backgroundColor: BG,
  },
  iconBtn: { padding: 8 },
  appBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: {
     position: 'absolute', top: 6, right: 8,
     backgroundColor: '#EF4444', width: 14, height: 14, borderRadius: 7,
     alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BG
  },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  avatarBtn: { padding: 2 },
  avatarSmall: {
     width: 36, height: 36, borderRadius: 18, backgroundColor: '#E2E8F0',
     alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
  },
  avatarSmallText: { fontSize: 16, color: TEXT_DARK, fontWeight: 'bold' },

  // Greeting
  greetingHeader: { marginBottom: 24, marginTop: 10 },
  greetingText: { fontSize: 16, color: TEXT_MUTED, fontFamily: 'Inter_500Medium' },
  userName: { fontSize: 26, color: TEXT_DARK, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 14, color: TEXT_MUTED, fontFamily: 'Inter_400Regular', marginTop: 4 },

  // Section Header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, color: TEXT_DARK, fontFamily: 'Inter_700Bold' },
  viewAllText: { fontSize: 14, color: PURPLE, fontFamily: 'Inter_600SemiBold' },

  // Family Horizontal Scroll
  familyScroll: { paddingRight: 20, gap: 16 },
  familyItem: { alignItems: 'center', width: 70 },
  familyAvatarContainer: {
     width: 64, height: 64, borderRadius: 32, padding: 3,
     backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
     shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
     marginBottom: 8
  },
  familyAvatar: {
     width: 58, height: 58, borderRadius: 29,
     alignItems: 'center', justifyContent: 'center'
  },
  familyInitials: { fontSize: 20, color: '#475569', fontFamily: 'Inter_700Bold' },
  familyItemName: { fontSize: 13, color: TEXT_DARK, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  familyItemRelation: { fontSize: 11, color: TEXT_MUTED, fontFamily: 'Inter_500Medium', textAlign: 'center', marginTop: 2 },

  // Summary Card
  summaryCard: {
     marginTop: 24, borderRadius: 24, padding: 20,
     shadowColor: '#5E35B1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  summaryTitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter_600SemiBold' },
  summaryCount: { fontSize: 22, color: '#fff', fontFamily: 'Inter_700Bold', marginTop: 4 },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginBottom: 20 },
  progressBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  summaryStatsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: CARD_BG, borderRadius: 16, padding: 16 },
  summaryStatItem: { alignItems: 'center', flex: 1 },
  summaryStatNum: { fontSize: 16, fontFamily: 'Inter_700Bold', marginVertical: 4 },
  summaryStatLabel: { fontSize: 11, color: TEXT_MUTED, fontFamily: 'Inter_500Medium' },

  // Quick actions grid — 4 items, 2x2 or row based on space. The screenshot has them in a row/grid. Let's do 2 columns of 2 or 4 in a row. It has 4 cards in a row with icons above text. We will use a wrap with width / 4 roughly.
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  quickCard: {
    width: (width - 40 - 36) / 4, // 4 items in a row
    backgroundColor: 'transparent', alignItems: 'center', gap: 8,
  },
  quickIconWrap: { 
     width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
     backgroundColor: CARD_BG, borderWidth: 1, borderColor: '#F1F5F9',
     shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1
  },
  quickLabel: { fontSize: 11, color: TEXT_DARK, fontFamily: 'Inter_600SemiBold', textAlign: 'center', lineHeight: 16 },

  // Alerts
  alertsContainer: { gap: 12 },
  alertCard: {
     flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
     backgroundColor: CARD_BG, padding: 16, borderRadius: 20,
     shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  alertAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  alertInfo: { flex: 1 },
  alertName: { fontSize: 14, color: TEXT_DARK, fontFamily: 'Inter_700Bold' },
  alertDesc: { fontSize: 13, color: TEXT_MUTED, fontFamily: 'Inter_500Medium', marginTop: 2 },
  alertRight: { flexDirection: 'row', alignItems: 'center' },
  alertTime: { fontSize: 12, color: TEXT_MUTED, fontFamily: 'Inter_500Medium' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24, paddingBottom: 40,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0',
    alignSelf: 'center', marginBottom: 20,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, color: TEXT_DARK, fontFamily: 'Inter_700Bold' },
  sheetClose: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 },
  tabRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tab: {
    flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0',
  },
  tabActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  tabText: { fontSize: 13, color: TEXT_MUTED, fontFamily: 'Inter_600SemiBold' },
  tabTextActive: { color: '#fff' },
  fieldLabel: { fontSize: 13, color: '#475569', fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  field: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: TEXT_DARK, fontFamily: 'Inter_400Regular', marginBottom: 14,
    backgroundColor: '#F8FAFC',
  },
  linkNote: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: PURPLE_LIGHT, borderRadius: 14, padding: 12, marginBottom: 16,
  },
  linkNoteText: { flex: 1, fontSize: 13, color: '#4C1D95', fontFamily: 'Inter_400Regular', lineHeight: 18 },
  submitBtn: {
    backgroundColor: PURPLE, paddingVertical: 16,
    borderRadius: 16, alignItems: 'center', marginTop: 4,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
});
