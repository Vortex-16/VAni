import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import Animated, { 
  FadeIn, 
  FadeInDown,
  SlideInDown, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withSequence, 
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Medicine, useApp } from "@/context/AppContext";

const { width, height } = Dimensions.get("window");
const PURPLE = "#A855F7";
const GREEN = "#10B981";
const AMBER = "#F59E0B";
const RED = "#EF4444";

interface ExtractedMed {
  name: string;
  dosage: string;
  frequency: string;
  frequency_code: string;
  duration: string;
  timing: string;
  notes: string;
  confidence: number;
  low_confidence: boolean;
  schedule: {
    morning: boolean;
    afternoon: boolean;
    night: boolean;
  };
}

interface ScanResult {
  medicines: ExtractedMed[];
  general_instructions: string;
  explanation: string;
  warnings: string[];
  overall_confidence: number;
  ocr_source: string;
  processing_note: string;
  quality?: {
    is_usable: boolean;
    overall_score: number;
    guidance: string;
    issues: Array<{ code: string; severity: string; message: string; score: number }>;
  };
}

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { addMedicine } = useApp();
  const cameraRef = React.useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [showResult, setShowResult] = useState(false);
  const [flashMode, setFlashMode] = useState<"on" | "off">("off");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const topInset = Platform.OS === "web" ? 20 : insets.top;

  // Viewfinder pulse animation
  const glowOpacity = useSharedValue(0.4);
  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.4, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: "#000", justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#fff", marginBottom: 20 }}>Camera permission needed</Text>
        <TouchableOpacity style={styles.allowBtn} onPress={requestPermission}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return GREEN;
    if (confidence >= 60) return AMBER;
    return RED;
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return "High";
    if (confidence >= 60) return "Medium";
    return "Low";
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;
    
    try {
      setIsProcessing(true);
      setProcessingStage("📷 Capturing image...");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo) throw new Error("Capture failed");

      setProcessingStage("🔍 Checking image quality...");
      
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/ocr/scan`, {
        method: "POST",
        body: JSON.stringify({ imageBase64: photo.base64 }),
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await (await import("@react-native-async-storage/async-storage")).default.getItem("discharge_buddy_token")}`
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMessage = errorData?.error || errorData?.warnings?.[0] || `Server error: ${res.status}`;
        throw new Error(errorMessage);
      }

      setProcessingStage("🧠 Analyzing prescription...");
      const data: ScanResult = await res.json();

      // Handle quality rejection
      if (data.quality && !data.quality.is_usable) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        alert(data.quality.guidance || "Image quality is too poor. Please try again with better lighting and hold steady.");
        setIsProcessing(false);
        setProcessingStage("");
        return;
      }

      if (data.medicines && data.medicines.length > 0) {
        setScanResult(data);
        setShowResult(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const warning = data.warnings?.[0] || "Could not detect medicines. Please ensure the prescription is clear and try again.";
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        alert(warning);
      }
    } catch (err: any) {
      console.error("Scan Error", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert(`Scan Failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsProcessing(false);
      setProcessingStage("");
    }
  };

  const handleConfirm = async () => {
    if (!scanResult) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    for (const med of scanResult.medicines) {
      // Generate time slots from schedule
      const times: string[] = [];
      if (med.schedule?.morning) times.push("08:00");
      if (med.schedule?.afternoon) times.push("14:00");
      if (med.schedule?.night) times.push("21:00");
      if (times.length === 0) times.push("08:00"); // Default

      await addMedicine({
        id: Math.random().toString(36).substr(2, 9),
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        times,
        instructions: [med.timing, med.notes].filter(Boolean).join(". "),
        simplifiedInstructions: med.frequency + (med.timing ? ` (${med.timing})` : ""),
        startDate: new Date().toISOString(),
        color: PURPLE,
      });
    }
    
    router.replace("/(tabs)");
  };

  const handleRetake = () => {
    setShowResult(false);
    setScanResult(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView 
        ref={cameraRef}
        style={StyleSheet.absoluteFill} 
        facing="back" 
        flash={flashMode} 
      />
      
      {/* Overlay */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]} />

      {/* Header */}
      <View style={[styles.header, { top: topInset + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>PRESCRIPTION SCANNER</Text>
        </View>

        <View style={styles.headerRight}>
          <BlurView intensity={20} tint="dark" style={styles.topControlPill}>
            <TouchableOpacity onPress={() => setFlashMode(f => f === "on" ? "off" : "on")} style={styles.topControlItem}>
              <Feather name="zap" size={16} color={flashMode === "on" ? "#FDE047" : "#fff"} />
            </TouchableOpacity>
          </BlurView>
        </View>
      </View>

      {/* Processing Stage Indicator */}
      {isProcessing && (
        <View style={[styles.statusLine, { top: topInset + 80 }]}>
          <Text style={styles.scanningText}>{processingStage || "PROCESSING..."}</Text>
        </View>
      )}

      {/* Scanning Indicator (when idle) */}
      {!isProcessing && !showResult && (
        <View style={[styles.statusLine, { top: topInset + 80 }]}>
          <Text style={styles.scanningText}>READY TO SCAN</Text>
        </View>
      )}

      {/* Viewfinder Frame */}
      {!showResult && (
        <View style={styles.viewfinderWrap} pointerEvents="none">
          <Animated.View style={[styles.viewfinder, glowStyle]}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />

            {!isProcessing && (
              <>
                <Animated.View entering={FadeIn.delay(200)} style={[styles.detectionBox, { top: "25%", left: "55%", width: "40%", height: 20 }]} />
                <Animated.View entering={FadeIn.delay(400)} style={[styles.detectionBox, { top: "45%", left: "10%", width: "50%", height: 22 }]} />
                <Animated.View entering={FadeIn.delay(600)} style={[styles.detectionBox, { top: "52%", left: "10%", width: "45%", height: 20 }]} />
              </>
            )}
          </Animated.View>
        </View>
      )}

      {/* Capture Button */}
      {!showResult && (
        <View style={[styles.footer, { bottom: insets.bottom + 40 }]}>
          <TouchableOpacity 
            style={[styles.captureBtn, isProcessing && { opacity: 0.5 }]} 
            onPress={handleCapture}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <View style={styles.captureInner} />
            )}
          </TouchableOpacity>
          {isProcessing && (
            <Text style={[styles.scanningText, { marginTop: 12 }]}>
              {processingStage || "ANALYZING..."}
            </Text>
          )}
        </View>
      )}

      {/* ─── Result Card ─── */}
      {showResult && scanResult && (
        <Animated.View 
          entering={SlideInDown.springify().damping(20)} 
          style={[styles.resultSheet, { paddingBottom: insets.bottom + 20 }]}
        >
          <View style={styles.sheetHandle} />
          
          <ScrollView 
            style={{ maxHeight: height * 0.65 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Overall Confidence Badge */}
            <Animated.View entering={FadeInDown.delay(100)} style={styles.confidenceBanner}>
              <View style={[styles.confidenceDot, { backgroundColor: getConfidenceColor(scanResult.overall_confidence) }]} />
              <Text style={styles.confidenceLabel}>
                Overall Confidence: {scanResult.overall_confidence}% ({getConfidenceLabel(scanResult.overall_confidence)})
              </Text>
              <Text style={styles.ocrSourceBadge}>
                {scanResult.ocr_source === "gemini_fallback" ? "AI Vision" : "Advanced OCR"}
              </Text>
            </Animated.View>

            {/* Explanation */}
            {scanResult.explanation ? (
              <Animated.View entering={FadeInDown.delay(200)} style={styles.explanationCard}>
                <Text style={styles.explanationTitle}>📋 Summary</Text>
                <Text style={styles.explanationText}>{scanResult.explanation}</Text>
              </Animated.View>
            ) : null}

            {/* Warnings */}
            {scanResult.warnings.length > 0 && (
              <Animated.View entering={FadeInDown.delay(250)} style={styles.warningsCard}>
                {scanResult.warnings.map((w, i) => (
                  <View key={i} style={styles.warningRow}>
                    <Feather name="alert-triangle" size={14} color={AMBER} />
                    <Text style={styles.warningText}>{w}</Text>
                  </View>
                ))}
              </Animated.View>
            )}

            {/* Medicines Header */}
            <View style={styles.resultHeader}>
              <View style={styles.medIconWrap}>
                <Feather name="package" size={20} color="#fff" />
              </View>
              <Text style={styles.resultTitle}>EXTRACTED MEDICINES ({scanResult.medicines.length})</Text>
            </View>

            {/* Medicine Cards */}
            {scanResult.medicines.map((med, idx) => (
              <Animated.View
                key={idx}
                entering={FadeInDown.delay(300 + idx * 100)}
                style={[
                  styles.medCard,
                  med.low_confidence && styles.medCardLowConf,
                ]}
              >
                {/* Confidence Badge */}
                <View style={styles.medCardHeader}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <View style={[styles.confBadge, { backgroundColor: `${getConfidenceColor(med.confidence)}20` }]}>
                    <View style={[styles.confDotSmall, { backgroundColor: getConfidenceColor(med.confidence) }]} />
                    <Text style={[styles.confBadgeText, { color: getConfidenceColor(med.confidence) }]}>
                      {med.confidence}%
                    </Text>
                  </View>
                </View>

                {/* Low confidence warning */}
                {med.low_confidence && (
                  <View style={styles.lowConfWarning}>
                    <Feather name="alert-circle" size={12} color={AMBER} />
                    <Text style={styles.lowConfText}>Low confidence — please verify this medicine</Text>
                  </View>
                )}

                <DetailRow label="Dosage" value={med.dosage} />
                <DetailRow label="Frequency" value={med.frequency} />
                {med.duration ? <DetailRow label="Duration" value={med.duration} /> : null}
                {med.timing ? <DetailRow label="Timing" value={med.timing} /> : null}

                {/* Schedule pills */}
                {med.schedule && (
                  <View style={styles.schedulePills}>
                    {med.schedule.morning && <SchedulePill label="🌅 Morning" />}
                    {med.schedule.afternoon && <SchedulePill label="☀️ Afternoon" />}
                    {med.schedule.night && <SchedulePill label="🌙 Night" />}
                  </View>
                )}

                {med.notes ? (
                  <Text style={styles.medNotes}>📝 {med.notes}</Text>
                ) : null}
              </Animated.View>
            ))}

            {/* General Instructions */}
            {scanResult.general_instructions ? (
              <Animated.View entering={FadeInDown.delay(500)} style={styles.generalCard}>
                <Text style={styles.explanationTitle}>📌 General Instructions</Text>
                <Text style={styles.explanationText}>{scanResult.general_instructions}</Text>
              </Animated.View>
            ) : null}

            {/* Processing Note */}
            <Text style={styles.processingNote}>{scanResult.processing_note}</Text>
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ marginTop: 16 }}>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <LinearGradient
                colors={[PURPLE, "#8B5CF6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <Feather name="check-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.confirmText}>CONFIRM & ADD MEDICINES</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.editBtn} onPress={handleRetake}>
              <Text style={styles.editText}>RETAKE / RESCAN</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}: </Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function SchedulePill({ label }: { label: string }) {
  return (
    <View style={styles.schedulePill}>
      <Text style={styles.schedulePillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  
  // Header
  header: { 
    position: "absolute", left: 0, right: 0, 
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, zIndex: 10 
  },
  headerTitleWrap: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  headerRight: { minWidth: 40, alignItems: "flex-end" },
  
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  
  topControlPill: { 
    flexDirection: "row", alignItems: "center", 
    backgroundColor: "rgba(255,255,255,0.1)", 
    borderRadius: 20, padding: 4 
  },
  topControlItem: { padding: 6 },

  statusLine: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 5 },
  scanningText: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "600", letterSpacing: 2 },

  viewfinderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  viewfinder: { 
    width: width * 0.82, height: height * 0.48, 
    position: "relative"
  },
  corner: { position: "absolute", width: 44, height: 44, borderColor: PURPLE, borderWidth: 4 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 28 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 28 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 28 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 28 },
  
  detectionBox: { 
    position: "absolute", backgroundColor: "rgba(168, 85, 247, 0.15)", 
    borderRadius: 6, borderWidth: 1, borderColor: "rgba(168, 85, 247, 0.5)",
    shadowColor: PURPLE, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2
  },

  footer: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  captureBtn: { 
    width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: "#fff", 
    padding: 6, alignItems: "center", justifyContent: "center" 
  },
  captureInner: { flex: 1, width: "100%", borderRadius: 36, backgroundColor: "#fff" },

  // ─── Result Sheet ───
  resultSheet: { 
    position: "absolute", bottom: 0, left: 0, right: 0, 
    backgroundColor: "#0D0D0D", borderTopLeftRadius: 36, borderTopRightRadius: 36,
    paddingHorizontal: 20, paddingTop: 12,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.4, shadowRadius: 24, elevation: 15
  },
  sheetHandle: { 
    width: 44, height: 4, backgroundColor: "rgba(255,255,255,0.2)", 
    borderRadius: 2, alignSelf: "center", marginBottom: 16 
  },

  // Overall confidence banner
  confidenceBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  confidenceDot: { width: 10, height: 10, borderRadius: 5 },
  confidenceLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600", flex: 1 },
  ocrSourceBadge: {
    fontSize: 10, fontWeight: "700", color: PURPLE,
    backgroundColor: "rgba(168,85,247,0.15)", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, overflow: "hidden", letterSpacing: 0.3,
  },

  // Explanation card
  explanationCard: {
    backgroundColor: "rgba(168,85,247,0.08)", borderRadius: 14,
    padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(168,85,247,0.15)",
  },
  explanationTitle: { color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 6 },
  explanationText: { color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 20 },

  // Warnings
  warningsCard: {
    backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 14,
    padding: 12, marginBottom: 12, gap: 8,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
  },
  warningRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  warningText: { color: "rgba(255,255,255,0.7)", fontSize: 12, flex: 1, lineHeight: 18 },

  // Medicine cards
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12, marginTop: 4 },
  medIconWrap: { 
    width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.1)", 
    alignItems: "center", justifyContent: "center" 
  },
  resultTitle: { color: "#fff", fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },

  medCard: {
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  medCardLowConf: {
    borderColor: "rgba(245,158,11,0.3)", backgroundColor: "rgba(245,158,11,0.04)",
  },
  medCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  medName: { color: "#fff", fontSize: 16, fontWeight: "700", flex: 1 },
  confBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  confDotSmall: { width: 7, height: 7, borderRadius: 4 },
  confBadgeText: { fontSize: 12, fontWeight: "700" },

  lowConfWarning: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(245,158,11,0.1)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8,
  },
  lowConfText: { color: AMBER, fontSize: 11, fontWeight: "600" },

  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  detailLabel: { color: "rgba(255,255,255,0.45)", fontSize: 14, fontWeight: "600" },
  detailValue: { color: "rgba(255,255,255,0.95)", fontSize: 14, fontWeight: "600" },

  schedulePills: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  schedulePill: {
    backgroundColor: "rgba(168,85,247,0.12)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  schedulePillText: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600" },

  medNotes: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 8, fontStyle: "italic" },

  generalCard: {
    backgroundColor: "rgba(16,185,129,0.08)", borderRadius: 14,
    padding: 14, marginTop: 8, borderWidth: 1, borderColor: "rgba(16,185,129,0.15)",
  },

  processingNote: {
    color: "rgba(255,255,255,0.25)", fontSize: 11, textAlign: "center",
    marginTop: 12, marginBottom: 8, fontStyle: "italic",
  },

  // Action buttons
  confirmBtn: { width: "100%", borderRadius: 18, overflow: "hidden", marginBottom: 10 },
  btnGradient: { 
    flexDirection: "row", alignItems: "center", justifyContent: "center", 
    paddingVertical: 16 
  },
  confirmText: { color: "#fff", fontSize: 15, fontWeight: "800", letterSpacing: 1 },
  editBtn: { 
    width: "100%", paddingVertical: 16, borderRadius: 18, 
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center"
  },
  editText: { color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  allowBtn: { backgroundColor: PURPLE, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
});
