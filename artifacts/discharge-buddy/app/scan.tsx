import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
import { File } from 'expo-file-system';
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Medicine, useApp, PrescriptionAnalysisResult, ExtractedMedicine } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width, height } = Dimensions.get("window");
const isSmall = width < 360;

const MEDICINE_COLORS = ["#0891b2", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];


export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addMedicine, addPrescription } = useApp();

  const [permission, requestPermission] = useCameraPermissions();
  const [image, setImage] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedMedicine[] | null>(null);
  const [analysis, setAnalysis] = useState<PrescriptionAnalysisResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashMode, setFlashMode] = useState<"on" | "off" | "auto">("off");
  const cameraRef = useRef<CameraView>(null);

  const topInset = Platform.OS === "web" ? 67 : Math.max(insets.top, 20);
  const bottomInset = Platform.OS === "web" ? 34 : Math.max(insets.bottom, 20);

  // Viewfinder Animation
  const cornerAnim = useSharedValue(0);
  useEffect(() => {
    cornerAnim.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 800 }),
        withTiming(0, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const vfStyle = useAnimatedStyle(() => ({
    padding: cornerAnim.value,
  }));

  if (!permission) {
    return <View />;
  }

  if (!permission.granted && !image) {
    return (
      <View style={[styles.container, { backgroundColor: "#1e1b4b", justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#fff", marginBottom: 20 }}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.allowBtn} onPress={requestPermission}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      processImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });
      if (photo?.uri) {
        setImage(photo.uri);
        processImage(photo.uri);
      }
    } catch (err) {
      console.error("Failed to take photo", err);
      setError("Could not capture image. Please try again or use gallery.");
    }
  };

  const validateAndGetBase64 = async (uri: string): Promise<string> => {
    try {
      // Use the modern SDK 54+ File API as suggested
      const file = new File(uri);
      const info = await file.info();
      
      if (!info.exists) {
        throw new Error("Captured image file not found.");
      }
      
      // If image is suspiciously small (under 5KB), it's likely corrupt or invalid
      if (info.size < 5000) {
        throw new Error("Captured image is too small or invalid. Please try again.");
      }

      console.log(`[Scan] Processing image: ${Math.round(info.size / 1024)} KB`);
      
      // Modern base64 conversion
      return await file.base64();
    } catch (err: any) {
      console.error("[Scan] File validation failed:", err);
      throw err;
    }
  };

  const processImage = async (uri: string) => {
    setProcessing(true);
    setExtracted(null);
    setAnalysis(null);
    setError(null);

    try {
      // Step 1: Preprocess on device (Resize & Compress)
      // This improves OCR accuracy and reduces network payload
      console.log("[Scan] Preprocessing image on device...");
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1000 } }], // Recommended width for OCR balance
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Step 2: Convert processed image to Base64
      console.log("[Scan] Reading processed image as base64...");
      const base64 = await validateAndGetBase64(manipulated.uri);

      // Safety check: Don't send if still too large for current backend setup
      if (base64.length > 5 * 1024 * 1024) {
        throw new Error("Image too large, please retake with better focus.");
      }

      // Step 3: Send to backend
      console.log("[Scan] Sending to backend OCR pipeline...");
      const result = await addPrescription(base64);

      if (result.medicines.length === 0 && result.warnings.length > 0) {
        setError(result.warnings[0]);
      } else {
        setExtracted(result.medicines);
        setAnalysis(result);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      console.error("[Scan] Failed to process image:", err);
      setError(err.message || "Failed to scan prescription. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setProcessing(false);
    }
  };

  const handleAddAll = () => {
    if (!extracted) return;
    extracted.forEach((med, i) => {
      addMedicine({
        id: `${Date.now()}_${i}`,
        name: med.name ?? "Unknown",
        dosage: med.dosage ?? "",
        frequency: med.frequency ?? "",
        times: med.times ?? ["08:00"],
        instructions: med.instructions ?? "",
        simplifiedInstructions: med.simplifiedInstructions ?? "",
        startDate: new Date().toISOString(),
        color: MEDICINE_COLORS[i % MEDICINE_COLORS.length],
      });
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  if (image) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingTop: topInset + 12, paddingBottom: bottomInset + 40, paddingHorizontal: 16 }}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="x" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Results</Text>
          <View style={{ width: 24 }} />
        </View>

        {error ? (
          <Animated.View entering={FadeIn} style={styles.processingBox}>
            <Feather name="alert-circle" size={40} color={colors.destructive} />
            <Text style={[styles.processingText, { color: colors.foreground }]}>Scan Failed</Text>
            <Text style={[styles.processingSubtext, { color: colors.mutedForeground }]}>{error}</Text>
            <TouchableOpacity onPress={() => { setImage(null); setError(null); }} style={[styles.retryBtn, { borderColor: colors.border, marginTop: 20, width: "100%" }]}>
              <Text style={[styles.retryText, { color: colors.foreground }]}>Try Again</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : processing ? (
          <Animated.View entering={FadeIn} style={styles.processingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.processingText, { color: colors.foreground }]}>Analyzing Scan...</Text>
            <Text style={[styles.processingSubtext, { color: colors.mutedForeground }]}>
              Using Groq AI + OCR to extract medicines
            </Text>
          </Animated.View>
        ) : extracted ? (
          <Animated.View entering={FadeIn} style={styles.extractedSection}>
            <View style={styles.extractedHeader}>
              <Feather name="check-circle" size={20} color={colors.success} />
              <Text style={[styles.extractedTitle, { color: colors.foreground }]}>
                {extracted.length} Medicines Found
              </Text>
            </View>

            {analysis?.warnings && analysis.warnings.length > 0 && (
              <View style={[styles.warningBox, { backgroundColor: colors.warning + "20", borderColor: colors.warning }]}>
                <Feather name="alert-triangle" size={16} color={colors.warning} />
                <Text style={[styles.warningText, { color: colors.foreground }]}>{analysis.warnings[0]}</Text>
              </View>
            )}

            {extracted.map((med, i) => (
              <View key={i} style={[styles.medExtractCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: MEDICINE_COLORS[i % MEDICINE_COLORS.length] }]}>
                <Text style={[styles.medExtractName, { color: colors.foreground }]}>{med.name}</Text>
                <Text style={[styles.medExtractDosage, { color: colors.mutedForeground }]}>
                  {med.dosage} · {med.frequency}
                </Text>
                {med.simplifiedInstructions && (
                  <Text style={[styles.medExtractInstructions, { color: colors.mutedForeground }]}>
                    {med.simplifiedInstructions}
                  </Text>
                )}
                {med.low_confidence && (
                  <View style={styles.lowConfBadge}>
                    <Text style={styles.lowConfText}>Double check these details</Text>
                  </View>
                )}
              </View>
            ))}

            <TouchableOpacity onPress={handleAddAll} style={[styles.addAllBtn, { backgroundColor: colors.primary }]}>
              <Feather name="plus-circle" size={18} color="#fff" />
              <Text style={styles.addAllText}>Add All to Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setImage(null); setExtracted(null); setAnalysis(null); }} style={[styles.retryBtn, { borderColor: colors.border }]}>
              <Text style={[styles.retryText, { color: colors.foreground }]}>Scan Another</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView 
        ref={cameraRef}
        style={StyleSheet.absoluteFill} 
        facing="back" 
        flash={flashMode as "on" | "off"} 
      />
      
      {/* Dark tint overlay for premium feel */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.3)" }]} />

      {/* Top Controls Pill */}
      <View style={[styles.topControlsWrap, { top: topInset }]}>
        <BlurView intensity={30} tint="dark" style={styles.pillGlass}>
          <TouchableOpacity style={styles.pillItem}>
            <Text style={styles.pillItemText}>HD</Text>
            <Text style={styles.pillItemSub}>Quality</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pillItem}>
            <Feather name="grid" size={16} color="#fff" />
            <Text style={styles.pillItemSub}>Grid</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pillItem} onPress={() => {
            Haptics.selectionAsync();
            setFlashMode(f => f === "off" ? "on" : "off");
          }}>
            <Feather name="zap" size={16} color={flashMode === "on" ? "#EAB308" : "#fff"} />
            <Text style={styles.pillItemSub}>Flash</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pillItem}>
            <Feather name="sliders" size={16} color="#fff" />
            <Text style={styles.pillItemSub}>Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pillItem} onPress={() => router.back()}>
            <Feather name="x" size={18} color="#fff" />
            <Text style={styles.pillItemSub}>Close</Text>
          </TouchableOpacity>
        </BlurView>
      </View>

      {/* Viewfinder Crop Outline */}
      <View style={styles.viewfinderContainer} pointerEvents="none">
        <Animated.View style={[styles.viewfinderBox, vfStyle]}>
          <Svg width="100%" height="100%" viewBox="0 0 300 400">
            {/* Top Left */}
            <Path d="M 0 40 L 0 0 L 40 0" stroke="#FDE047" strokeWidth="4" fill="none" strokeLinejoin="round" />
            {/* Top Right */}
            <Path d="M 260 0 L 300 0 L 300 40" stroke="#FDE047" strokeWidth="4" fill="none" strokeLinejoin="round" />
            {/* Bottom Left */}
            <Path d="M 0 360 L 0 400 L 40 400" stroke="#FDE047" strokeWidth="4" fill="none" strokeLinejoin="round" />
            {/* Bottom Right */}
            <Path d="M 300 360 L 300 400 L 260 400" stroke="#FDE047" strokeWidth="4" fill="none" strokeLinejoin="round" />
          </Svg>
        </Animated.View>
      </View>

      {/* Bottom Actions Pill */}
      <View style={[styles.bottomControlsWrap, { bottom: bottomInset + 20 }]}>
        <BlurView intensity={30} tint="dark" style={styles.bottomPill}>
          <TouchableOpacity style={styles.bottomSideBtn} onPress={pickImage}>
            <Feather name="image" size={20} color="#fff" />
            <Text style={styles.bottomSideText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shutterBtnOuter} onPress={takePhoto} activeOpacity={0.8}>
            <View style={styles.shutterBtnInner}>
              <Feather name="camera" size={24} color="#1E1B4B" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomSideBtn}>
            <Text style={styles.bottomSideLabelText}>DOC</Text>
            <Text style={styles.bottomSideText}>Presets</Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  allowBtn: { backgroundColor: "#6C47FF", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  
  // Camera Layout
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  topControlsWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  pillGlass: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: "88%",
    maxWidth: 400,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  pillItem: { alignItems: "center", justifyContent: "center", gap: 3 },
  pillItemText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  pillItemSub: { color: "rgba(255,255,255,0.7)", fontSize: 9, fontFamily: "Inter_500Medium" },

  // ViewFinder
  viewfinderContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  viewfinderBox: { width: "75%", height: "55%", maxWidth: 320, maxHeight: 450 },

  // Bottom Pill
  bottomControlsWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  bottomPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 10,
    width: "82%",
    maxWidth: 380,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  bottomSideBtn: { alignItems: "center", justifyContent: "center", gap: 4, flex: 1 },
  bottomSideText: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontFamily: "Inter_500Medium" },
  bottomSideLabelText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  
  shutterBtnOuter: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 3, borderColor: "#FDE047",
    padding: 3,
    alignItems: "center", justifyContent: "center",
  },
  shutterBtnInner: {
    flex: 1, width: "100%", borderRadius: 50,
    backgroundColor: "#FDE047",
    alignItems: "center", justifyContent: "center",
  },

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
  warningBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 4 },
  warningText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  lowConfBadge: { backgroundColor: "#fef3c7", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  lowConfText: { fontSize: 10, color: "#92400e", fontFamily: "Inter_600SemiBold" },
});
