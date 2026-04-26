import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  Platform,
  ActivityIndicator,
} from 'react-native';
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

const FAQS = [
  {
    q: "How do I scan a prescription?",
    a: "Go to the Medicines tab and tap the camera icon. Center your prescription in the frame and wait for our AI to extract the dosage and schedule."
  },
  {
    q: "What if the AI makes a mistake?",
    a: "You can always edit any medication manually by tapping the 'All Meds' tab, selecting the medicine, and hitting the edit icon."
  },
  {
    q: "How do I share reports with my doctor?",
    a: "In your Profile tab, tap 'Export Report'. You can then share the professional PDF directly via email or messaging apps."
  },
  {
    q: "Can I add a caregiver to my account?",
    a: "Yes! Go to Profile > Linked Accounts and invite a caregiver using their email address. They will be able to monitor your adherence."
  }
];

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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
               <Feather name="cpu" size={24} color={PURPLE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTitle}>Talk to AI Guide</Text>
              <Text style={styles.aiSub}>Instant answers about app features</Text>
            </View>
            <Feather name="arrow-right" size={20} color={PURPLE} />
          </LinearGradient>
        </AnimPressable>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {FAQS.map((faq, i) => <FAQItem key={i} {...faq} />)}
        </View>

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
                <ActivityIndicator color={WHITE} size="small" />
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
  sendText: { color: WHITE, fontSize: 16, fontFamily: "Inter_700Bold" }
});
