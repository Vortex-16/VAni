import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, LayoutAnimation, Platform,  } from 'react-native';
import { DotLoader } from "../components/DotLoader";
import { TranslateText as Text } from '@/components/TranslateText';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { AnimPressable } from '@/components/AnimPressable';
import { SuccessBurst } from '@/components/SuccessBurst';
import { useApp } from '@/context/AppContext';
import { ApiProvider } from '@/context/ApiProvider';

const PURPLE = "#6C47FF";
const WHITE = "#FFFFFF";

const PATIENT_FAQS = [
  {
    q: "How do I scan a prescription?",
    a: "Go to the Medicines tab (bottom bar) > Tap the camera icon at the top right to start scanning your prescription."
  },
  {
    q: "How do I edit my medicines?",
    a: "Go to the Medicines tab > Tap any medicine from your list > Tap the Edit icon (pencil) in the top corner to modify."
  },
  {
    q: "Where do I track my symptoms?",
    a: "Tap the Symptoms tab in the bottom bar to log a new symptom, view historical logs, or see your recovery status."
  },
  {
    q: "How do I view my daily schedule?",
    a: "Tap the Schedule tab in the bottom bar to see all medicines scheduled for today sorted by morning, afternoon, and evening."
  }
];

const FAMILY_FAQS = [
  {
    q: "How do I monitor my family member?",
    a: "Go to the Family Dashboard. You will see a live overview of your linked patient's medication logs and symptom trends."
  },
  {
    q: "How do I link a patient?",
    a: "On the Family Dashboard, tap the 'Add Patient' button and enter the unique link code provided by your loved one."
  },
  {
    q: "How do I check my patient's profile?",
    a: "Tap the profile card of your family member in the dashboard list to see their detailed medicines list, trends, and follow-ups."
  }
];

const NAVIGATION_GUIDE: Record<string, { action: string; steps: string }[]> = {
  patient: [
    { action: "Check your medicines", steps: "Tap 'Medicines' in the bottom navigation bar." },
    { action: "Record a new symptom", steps: "Tap 'Symptoms' in the bottom navigation bar > Tap 'Log Symptom'." },
    { action: "See daily dosing times", steps: "Tap 'Schedule' in the bottom navigation bar to view morning/evening pills." },
    { action: "Scan a physical prescription", steps: "Tap 'Medicines' in the bottom bar > Tap the Camera icon at the top right." },
    { action: "Trigger emergency distress", steps: "Tap 'Emergency' in the bottom bar > Hold the big red button to alert contacts." }
  ],
  family: [
    { action: "Add/Link a new patient", steps: "Tap the '+' plus button at the top right of the dashboard > enter their link code." },
    { action: "Check a patient's adherence", steps: "Tap their name on your dashboard to see a calendar check of taken/missed pills." },
    { action: "View a patient's symptoms", steps: "Tap their name on your dashboard > scroll down to the 'Symptom History' section." }
  ],
  caregiver: [
    { action: "Create discharge plans", steps: "Use the Web Console to design, edit, and dispatch digital plans to patients." },
    { action: "Review high-risk patients", steps: "View active alerts and patient cards on the Web Dashboard." }
  ]
};

function FAQItem({ q, a }: { q: string, a: string }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <TouchableOpacity onPress={toggle} style={styles.faqItem} activeOpacity={0.7}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{q}</Text>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={PURPLE} />
      </View>
      {expanded && (
        <View style={{ gap: 12 }}>
          <Text style={styles.faqAnswer}>{a}</Text>
          <View style={styles.faqFeedback}>
            <Text style={styles.faqFeedbackText}>Was this helpful?</Text>
            <View style={styles.faqFeedbackBtns}>
              <TouchableOpacity style={styles.faqFeedbackBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <Feather name="thumbs-up" size={14} color="#64748b" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.faqFeedbackBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <Feather name="thumbs-down" size={14} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function HelpCenter() {
  const insets = useSafeAreaInsets();
  const { user, api } = useApp();
  
  const role = user?.role || "patient";
  const roleFAQS = role === "patient" ? PATIENT_FAQS : (role === "family" ? FAMILY_FAQS : []);
  const guideSteps = NAVIGATION_GUIDE[role] || [];
  
  const [feedbackType, setFeedbackType] = useState<"bug" | "feature" | "general">("general");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    setIsSending(true);
    try {
      await api.submitFeedback(feedbackType, message);
      
      setShowSuccess(true);
      setMessage("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("Feedback failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  const openAIGuide = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/chat",
      params: { mode: 'help', title: 'D-Buddy Guide' }
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#4B26C8", PURPLE]}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              if (role === "caregiver") {
                router.replace("/caregiver/dashboard");
              } else if (role === "family") {
                router.replace("/family/dashboard");
              } else {
                router.replace("/(tabs)");
              }
            }
          }} 
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={24} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Feedback</Text>
        <Text style={styles.headerSub}>How can we support your recovery today?</Text>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Guide Section */}
        <AnimPressable style={styles.aiCard} onPress={openAIGuide}>
           <LinearGradient
            colors={["#EDE9FE", "#F5F3FF"]}
            style={styles.aiGradient}
          >
            <View style={styles.aiIconWrap}>
               <Feather name="message-square" size={24} color={PURPLE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTitle}>Talk to AI Guide</Text>
              <Text style={styles.aiSub}>Instant answers about app features</Text>
            </View>
            <Feather name="arrow-right" size={20} color={PURPLE} />
          </LinearGradient>
        </AnimPressable>


        {/* Live Tracking Section */}
        <AnimPressable style={styles.demoCard} onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/judge-demo");
        }}>
           <LinearGradient
            colors={["#FEF2F2", "#FFF1F2"]}
            style={styles.demoGradient}
          >
            <View style={styles.demoIconWrap}>
               <Feather name="map-pin" size={24} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.demoTitle}>Live Tracking</Text>
              <Text style={styles.demoSub}>Track SOS dispatch & ambulance location in real-time</Text>
            </View>
            <Feather name="arrow-right" size={20} color="#EF4444" />
          </LinearGradient>
        </AnimPressable>

        {/* Navigation Guide / Confused? */}
        {guideSteps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step-by-Step Navigation Guide</Text>
            <View style={styles.guideCard}>
              {guideSteps.map((step, idx) => (
                <View key={idx} style={[styles.guideItem, idx < guideSteps.length - 1 && styles.guideItemBorder]}>
                  <Text style={styles.guideAction}>{step.action}</Text>
                  <Text style={styles.guideSteps}>{step.steps}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* FAQs */}
        {roleFAQS.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            {roleFAQS.map((faq, i) => <FAQItem key={i} {...faq} />)}
          </View>
        )}

        {/* Feedback Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send Feedback</Text>
          <View style={styles.feedbackCard}>
            <View style={styles.typeRow}>
              {(["general", "bug", "feature"] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setFeedbackType(type)}
                  style={[styles.typeBtn, feedbackType === type && styles.typeBtnActive]}
                >
                  <Text style={[styles.typeText, feedbackType === type && styles.typeTextActive]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="What's on your mind?"
              multiline
              value={message}
              onChangeText={setMessage}
              placeholderTextColor="#94a3b8"
            />

            <TouchableOpacity 
              style={[styles.sendBtn, !message.trim() && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={isSending || !message.trim()}
            >
              {isSending ? (
                <DotLoader color={WHITE} size={6} />
              ) : (
                <>
                  <Text style={styles.sendText}>Submit Feedback</Text>
                  <Feather name="send" size={16} color={WHITE} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <SuccessBurst 
        visible={showSuccess} 
        onComplete={() => setShowSuccess(false)} 
        message="Feedback Sent!"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backBtn: { marginBottom: 16 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: WHITE },
  headerSub: { fontSize: 16, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 4 },
  content: { padding: 24, gap: 24 },
  
  aiCard: { borderRadius: 20, overflow: 'hidden', elevation: 2, shadowColor: PURPLE, shadowOpacity: 0.1, shadowRadius: 10 },
  aiGradient: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  aiIconWrap: { width: 50, height: 50, borderRadius: 15, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  aiTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1E1B4B' },
  aiSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#64748b', marginTop: 2 },

  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#1E1B4B", marginBottom: 4 },
  
  faqItem: { backgroundColor: WHITE, borderRadius: 16, padding: 16, gap: 12, elevation: 1 },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#1E1B4B", flex: 1, paddingRight: 10 },
  faqAnswer: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#64748b", lineHeight: 20 },
  faqFeedback: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  faqFeedbackText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#94a3b8" },
  faqFeedbackBtns: { flexDirection: 'row', gap: 12 },
  faqFeedbackBtn: { padding: 4 },

  feedbackCard: { backgroundColor: WHITE, borderRadius: 20, padding: 20, gap: 16, elevation: 2 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: 'center' },
  typeBtnActive: { backgroundColor: `${PURPLE}15`, borderWidth: 1, borderColor: PURPLE },
  typeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#64748b" },
  typeTextActive: { color: PURPLE },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 15,
    color: "#1E1B4B",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  sendBtn: {
    backgroundColor: PURPLE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8
  },
  sendText: { color: WHITE, fontSize: 16, fontFamily: "Inter_700Bold" },
  guideCard: { backgroundColor: WHITE, borderRadius: 20, padding: 20, gap: 14, elevation: 2 },
  guideItem: { gap: 4, paddingBottom: 12 },
  guideItemBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  guideAction: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#1E1B4B" },
  guideSteps: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#64748b", lineHeight: 18 },
  demoCard: { borderRadius: 20, overflow: 'hidden', elevation: 2, shadowColor: "#EF4444", shadowOpacity: 0.1, shadowRadius: 10 },
  demoGradient: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  demoIconWrap: { width: 50, height: 50, borderRadius: 15, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  demoTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#991B1B' },
  demoSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#991B1B', marginTop: 2, opacity: 0.8 }
});
