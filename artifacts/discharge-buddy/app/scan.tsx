import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";

import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
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
  Image,
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

import { Medicine, useApp, PrescriptionAnalysisResult, ExtractedMedicine } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width, height } = Dimensions.get("window");
const isSmall = width < 360;

const MEDICINE_COLORS = ["#0891b2", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];
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
  const colors = useColors();
  const cameraRef = useRef<CameraView>(null);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [showResult, setShowResult] = useState(false);
  const [flashMode, setFlashMode] = useState<"on" | "off">("off");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const topInset = Platform.OS === "web" ? 20 : insets.top;

  // Viewfinder pulse animation
  const glowOpacity = useSharedValue(0.4);
  const scanLineY = useSharedValue(0);

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

  useEffect(() => {
    if (isProcessing) {
      scanLineY.value = withRepeat(
        withSequence(
          withTiming(height * 0.48 - 4, { duration: 1500 }),
          withTiming(0, { duration: 1500 })
        ),
        -1,
        true
      );
    } else {
      scanLineY.value = 0;
    }
  }, [isProcessing]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
    opacity: isProcessing ? 1 : 0,
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
        quality: 0.7,
        base64: true,
      });

      if (!photo?.base64) throw new Error("Could not capture image data.");
      
      setCapturedImage(photo.uri);

      setProcessingStage("🔍 Extracting medicines...");
      
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      const token = await (await import("@react-native-async-storage/async-storage")).default.getItem("discharge_buddy_token");
      
      const response = await fetch(`${apiUrl}/api/ocr/scan`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ imageBase64: photo.base64 }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || "Server failed to process scan.");
      }

      const result = await response.json();
      setScanResult(result);
      setShowResult(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error("Scan failed:", err);
      alert(err.message || "Failed to scan prescription. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCapturedImage(null);
    } finally {
      setIsProcessing(false);
      setProcessingStage("");
    }
  };

  const handleRetake = () => {
    setShowResult(false);
    setScanResult(null);
    setCapturedImage(null);
  };

  const handleConfirm = async () => {
    if (!scanResult) return;
    try {
      for (const med of scanResult.medicines) {
        await addMedicine({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          timing: med.timing,
          notes: med.notes,
        } as any);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err) {
      console.error("Failed to add medicines:", err);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {!showResult && (
        <CameraView 
          ref={cameraRef}
          style={StyleSheet.absoluteFill} 
          facing="back" 
          flash={flashMode} 
        />
      )}

      {/* Captured Image Freeze Frame */}
      {capturedImage && !showResult && (
        <Image 
          source={{ uri: capturedImage }} 
          style={StyleSheet.absoluteFill} 
        />
      )}

      {/* Header Overlay */}
      <View style={[styles.header, { top: topInset + 10 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>PRESCRIPTION SCANNER</Text>
        </View>
        <View style={styles.headerRight}>
          <BlurView intensity={20} tint="dark" style={styles.topControlPill}>
            <TouchableOpacity onPress={() => setFlashMode(f => f === "on" ? "off" : "on")} style={styles.topControlItem}>
              <Feather name="zap" size={20} color={flashMode === "on" ? "#EAB308" : "#fff"} />
            </TouchableOpacity>
          </BlurView>
        </View>
      </View>

      {/* Scanning Indicator */}
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
            <Animated.View style={[styles.scanLine, scanLineStyle]} />
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

      {/* Result Card Overlay */}
      {showResult && scanResult && (
        <Animated.View 
          entering={SlideInDown.springify().damping(20)} 
          style={[styles.resultSheet, { paddingBottom: insets.bottom + 20 }]}
        >
          <View style={styles.sheetHandle} />
          
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.7 }}>
            <Animated.View entering={FadeInDown.delay(100)} style={styles.confidenceBanner}>
              <View style={[styles.confidenceDot, { backgroundColor: getConfidenceColor(scanResult.overall_confidence) }]} />
              <Text style={styles.confidenceLabel}>
                Confidence: {scanResult.overall_confidence}% ({getConfidenceLabel(scanResult.overall_confidence)})
              </Text>
              <Text style={styles.ocrSourceBadge}>
                {scanResult.ocr_source === "gemini_fallback" ? "AI Vision" : "Advanced OCR"}
              </Text>
            </Animated.View>

            {scanResult.explanation && (
              <Animated.View entering={FadeInDown.delay(200)} style={styles.explanationCard}>
                <Text style={styles.explanationTitle}>📋 Summary</Text>
                <Text style={styles.explanationText}>{scanResult.explanation}</Text>
              </Animated.View>
            )}

            <View style={styles.resultHeader}>
              <Feather name="package" size={20} color={PURPLE} />
              <Text style={styles.resultTitle}>EXTRACTED MEDICINES</Text>
            </View>

            {scanResult.medicines.map((med, idx) => (
              <Animated.View key={idx} entering={FadeInDown.delay(300 + idx * 100)} style={[styles.medCard, med.low_confidence && styles.medCardLowConf]}>
                <View style={styles.medCardHeader}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <View style={[styles.confBadge, { backgroundColor: `${getConfidenceColor(med.confidence)}20` }]}>
                    <Text style={[styles.confBadgeText, { color: getConfidenceColor(med.confidence) }]}>{med.confidence}%</Text>
                  </View>
                </View>
                
                {med.low_confidence && (
                  <View style={styles.lowConfWarning}>
                    <Feather name="alert-circle" size={12} color={AMBER} />
                    <Text style={styles.lowConfText}>Low confidence — please verify</Text>
                  </View>
                )}

                <DetailRow label="Dosage" value={med.dosage} />
                <DetailRow label="Frequency" value={med.frequency} />
                {med.notes ? <Text style={styles.medNotes}>📝 {med.notes}</Text> : null}
              </Animated.View>
            ))}

            {scanResult.general_instructions && (
              <Animated.View entering={FadeInDown.delay(500)} style={styles.generalCard}>
                <Text style={styles.explanationTitle}>📌 General Instructions</Text>
                <Text style={styles.explanationText}>{scanResult.general_instructions}</Text>
              </Animated.View>
            )}

            <View style={{ marginTop: 24, gap: 12 }}>
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
            
            <Text style={styles.processingNote}>{scanResult.processing_note}</Text>
          </ScrollView>
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
  
  scanLine: {
    position: "absolute", left: 0, right: 0, top: 0,
    height: 4, backgroundColor: PURPLE,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8, shadowRadius: 8, elevation: 5,
    borderRadius: 2
  },

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

  // Results Styles
  processingBox: { alignItems: "center", padding: 40, gap: 14, marginTop: "20%" },
  processingText: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  processingSubtext: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  extractedSection: { gap: 14 },
  extractedHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  extractedTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  medExtractCard: { padding: 16, borderRadius: 16, borderWidth: 1, borderLeftWidth: 4, gap: 6 },
  medExtractName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  medExtractDosage: { fontSize: 14, fontFamily: "Inter_500Medium" },
  medExtractInstructions: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  addAllBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16, marginTop: 10 },
  addAllText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  retryText: { fontSize: 15, fontFamily: "Inter_500Medium" },
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
