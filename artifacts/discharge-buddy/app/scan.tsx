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
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import Animated, { 
  FadeIn, 
  SlideInDown, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withSequence, 
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";

import { Medicine, useApp } from "@/context/AppContext";

const { width, height } = Dimensions.get("window");
const PURPLE = "#A855F7";

interface ExtractedMed {
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  simplifiedInstructions: string;
}

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { addMedicine } = useApp();
  const cameraRef = React.useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [flashMode, setFlashMode] = useState<"on" | "off">("off");
  const [confidence, setConfidence] = useState(0);
  const [extractedMeds, setExtractedMeds] = useState<ExtractedMed[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const topInset = Platform.OS === "web" ? 20 : insets.top;

  // Scanning progress simulation
  useEffect(() => {
    if (isScanning && !showResult) {
      let interval = setInterval(() => {
        setConfidence(prev => {
          if (prev >= 98) return 98;
          return prev + Math.floor(Math.random() * 3);
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isScanning, showResult]);

  // viewfinder pulse logic... (omitted for brevity in replace, but keeping it in the file)
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

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;
    
    try {
      setIsProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (!photo) throw new Error("Capture failed");

      // Stop scanning animation
      setIsScanning(false);
      setConfidence(100);

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
      const formData = new FormData();
      
      // @ts-ignore - FormData needs different handling on RN
      formData.append("file", {
        uri: photo.uri,
        name: "prescription.jpg",
        type: "image/jpeg",
      });

      const res = await fetch(`${apiUrl}/api/ocr/scan`, {
        method: "POST",
        body: formData,
        headers: {
          "Accept": "application/json",
          // Token will be added by provider if using customFetch, 
          // but here we use raw fetch to handle FormData easily
          "Authorization": `Bearer ${await (await import("@react-native-async-storage/async-storage")).default.getItem("discharge_buddy_token")}`
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("[DEBUG ERROR] Server extraction failed. Status:", res.status, "Body:", errorText);
        throw new Error(`Server extraction failed: ${res.status}`);
      }

      const data = await res.json();
      console.log("[DEBUG] Extracted Data from Tesseract:", data);

      if (data.medicines && data.medicines.length > 0) {
        setExtractedMeds(data.medicines);
        setShowResult(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        alert("Could not detect medicines. Please ensure the prescription is clear and try again.");
        setIsScanning(true);
        setConfidence(0);
      }
    } catch (err: any) {
      console.error("Scan Error", err);
      alert(`Scan Failed: ${err.message || "Unknown error"}. Check backend logs.`);
      setIsScanning(true);
      setConfidence(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Save all extracted medicines
    for (const med of extractedMeds) {
      await addMedicine({
        id: Math.random().toString(36).substr(2, 9),
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        times: ["08:00"], // Default
        instructions: med.instructions,
        simplifiedInstructions: med.simplifiedInstructions,
        startDate: new Date().toISOString(),
        color: PURPLE,
      });
    }
    
    router.replace("/(tabs)");
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
      
      {/* Immersive Overlay */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]} />

      {/* FIXED Header: Clearer spacing and no overlap */}
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
                <View style={styles.topControlDivider} />
                <TouchableOpacity style={styles.topControlItem}>
                    <Feather name="mic-off" size={16} color="#fff" />
                </TouchableOpacity>
            </BlurView>
        </View>
      </View>

      {/* Scanning status */}
      {!showResult && (
        <View style={[styles.statusLine, { top: topInset + 80 }]}>
            <Text style={styles.scanningText}>SCANNING...</Text>
        </View>
      )}

      {/* NEW: Right Vertical Control Pill (from feedback image) */}
      {!showResult && (
        <View style={styles.rightVerticalControls}>
            <BlurView intensity={30} tint="dark" style={styles.verticalPill}>
                <TouchableOpacity style={styles.verticalItem}>
                    <Feather name="refresh-cw" size={18} color="#fff" />
                </TouchableOpacity>
                <View style={styles.verticalDivider} />
                <TouchableOpacity style={styles.verticalItem}>
                    <Feather name="more-horizontal" size={18} color="#fff" />
                </TouchableOpacity>
            </BlurView>
        </View>
      )}

      {/* Viewfinder Frame */}
      <View style={styles.viewfinderWrap} pointerEvents="none">
        <Animated.View style={[styles.viewfinder, glowStyle]}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />

            {/* Glowing Text Detection Boxes */}
            {isScanning && (
                <>
                    <Animated.View entering={FadeIn.delay(200)} style={[styles.detectionBox, { top: "25%", left: "55%", width: "40%", height: 20 }]} />
                    <Animated.View entering={FadeIn.delay(400)} style={[styles.detectionBox, { top: "45%", left: "10%", width: "50%", height: 22 }]} />
                    <Animated.View entering={FadeIn.delay(600)} style={[styles.detectionBox, { top: "52%", left: "10%", width: "45%", height: 20 }]} />
                </>
            )}

            {!showResult && (
                <Text style={styles.confidenceText}>Confidence: {confidence}%</Text>
            )}
        </Animated.View>
      </View>

      {/* Shutter Button */}
      {!showResult && (
        <View style={[styles.footer, { bottom: insets.bottom + 40 }]}>
            <TouchableOpacity 
                style={[styles.captureBtn, isProcessing && { opacity: 0.5 }]} 
                onPress={handleCapture}
                disabled={isProcessing}
            >
                {isProcessing ? (
                     <View style={{ transform: [{ scale: 1.5 }] }}>
                        <Feather name="loader" size={24} color="#fff" />
                     </View>
                ) : (
                    <View style={styles.captureInner} />
                )}
            </TouchableOpacity>
            {isProcessing && (
                <Text style={[styles.scanningText, { marginTop: 12 }]}>AI IS READING...</Text>
            )}
        </View>
      )}

      {/* Result Card */}
      {showResult && (
        <Animated.View 
            entering={SlideInDown.springify().damping(20)} 
            style={[styles.resultSheet, { paddingBottom: insets.bottom + 20 }]}
        >
            <View style={styles.sheetHandle} />
            
            <View style={styles.resultHeader}>
                <View style={styles.medIconWrap}>
                    <Feather name="package" size={20} color="#fff" />
                </View>
                <Text style={styles.resultTitle}>EXTRACTED MEDICATION</Text>
            </View>

            <View style={styles.resultBody}>
                {extractedMeds.map((med, idx) => (
                    <View key={idx} style={{ marginBottom: 12, borderBottomWidth: idx < extractedMeds.length - 1 ? 1 : 0, borderBottomColor: "rgba(255,255,255,0.05)", paddingBottom: 12 }}>
                        <DetailRow label="Med" value={med.name} />
                        <DetailRow label="Dose" value={med.dosage} />
                        <DetailRow label="Frequency" value={med.frequency} />
                    </View>
                ))}
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                <LinearGradient
                    colors={[PURPLE, "#8B5CF6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btnGradient}
                >
                    <Feather name="maximize" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.confirmText}>CONFIRM</Text>
                </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.editBtn} onPress={() => setShowResult(false)}>
                <Text style={styles.editText}>EDIT/RESYNC</Text>
            </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

function DetailRow({ label, value, isHigh }: { label: string; value: string; isHigh?: boolean }) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}: </Text>
            <Text style={[styles.detailValue, isHigh && { color: "#fff" }]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  
  // Header with correct spacing
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
  topControlDivider: { width: 1, height: 16, backgroundColor: "rgba(255,255,255,0.2)" },

  statusLine: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 5 },
  scanningText: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "600", letterSpacing: 2 },

  // Right vertical controls from image
  rightVerticalControls: { position: "absolute", right: 16, top: height * 0.4, zIndex: 10 },
  verticalPill: { 
    backgroundColor: "rgba(255,255,255,0.1)", 
    borderRadius: 24, paddingVertical: 8, paddingHorizontal: 4,
    alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)"
  },
  verticalItem: { padding: 10 },
  verticalDivider: { width: 16, height: 1, backgroundColor: "rgba(255,255,255,0.15)" },

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
  confidenceText: { 
    position: "absolute", bottom: -36, right: 0, 
    color: "#fff", fontSize: 12, fontWeight: "600", opacity: 0.7 
  },

  footer: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  captureBtn: { 
    width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: "#fff", 
    padding: 6, alignItems: "center", justifyContent: "center" 
  },
  captureInner: { flex: 1, width: "100%", borderRadius: 36, backgroundColor: "#fff" },

  resultSheet: { 
    position: "absolute", bottom: 0, left: 0, right: 0, 
    backgroundColor: "#0D0D0D", borderTopLeftRadius: 36, borderTopRightRadius: 36,
    paddingHorizontal: 24, paddingTop: 12,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.4, shadowRadius: 24, elevation: 15
  },
  sheetHandle: { 
    width: 44, height: 4, backgroundColor: "rgba(255,255,255,0.2)", 
    borderRadius: 2, alignSelf: "center", marginBottom: 20 
  },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  medIconWrap: { 
    width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.1)", 
    alignItems: "center", justifyContent: "center" 
  },
  resultTitle: { color: "#fff", fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  resultBody: { gap: 10, marginBottom: 24 },
  detailRow: { flexDirection: "row", alignItems: "center" },
  detailLabel: { color: "rgba(255,255,255,0.45)", fontSize: 15, fontWeight: "600" },
  detailValue: { color: "rgba(255,255,255,0.95)", fontSize: 15, fontWeight: "600" },

  confirmBtn: { width: "100%", borderRadius: 18, overflow: "hidden", marginBottom: 12 },
  btnGradient: { 
    flexDirection: "row", alignItems: "center", justifyContent: "center", 
    paddingVertical: 18 
  },
  confirmText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 1 },
  editBtn: { 
    width: "100%", paddingVertical: 18, borderRadius: 18, 
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center"
  },
  editText: { color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  allowBtn: { backgroundColor: PURPLE, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
});
