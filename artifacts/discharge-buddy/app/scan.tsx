import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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

import { Medicine, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width, height } = Dimensions.get("window");
const isSmall = width < 360;

const MEDICINE_COLORS = ["#0891b2", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

const MOCK_EXTRACTED: Partial<Medicine>[] = [
  {
    name: "Amlodipine",
    dosage: "5mg",
    frequency: "Once daily",
    times: ["08:00"],
    instructions: "Take once daily for blood pressure control. May cause ankle swelling.",
    simplifiedInstructions: "Take this pill every morning. It controls blood pressure. Tell doctor if legs swell.",
  },
  {
    name: "Omeprazole",
    dosage: "20mg",
    frequency: "Once daily",
    times: ["07:00"],
    instructions: "Take 30 minutes before breakfast for stomach protection.",
    simplifiedInstructions: "Take this capsule 30 minutes before breakfast. It protects your stomach.",
  },
];

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addMedicine, addPrescription } = useApp();

  const [permission, requestPermission] = useCameraPermissions();
  const [image, setImage] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Partial<Medicine>[] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [flashMode, setFlashMode] = useState<"on" | "off" | "auto">("off");

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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      processImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    // In a real app we'd use cameraRef.current.takePictureAsync()
    // but since we are mocking extraction anyway we can just mock capture
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setImage("preview"); // Mock active image state
    processImage("mock_captured_uri");
  };

  const processImage = async (uri: string) => {
    setProcessing(true);
    setExtracted(null);
    await addPrescription(uri);
    await new Promise((r) => setTimeout(r, 1500));
    setExtracted(MOCK_EXTRACTED);
    setProcessing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

        {processing ? (
          <Animated.View entering={FadeIn} style={styles.processingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.processingText, { color: colors.foreground }]}>Analyzing Scan...</Text>
            <Text style={[styles.processingSubtext, { color: colors.mutedForeground }]}>
              Extracting your medicines via AI
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

            {extracted.map((med, i) => (
              <View key={i} style={[styles.medExtractCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: MEDICINE_COLORS[i % MEDICINE_COLORS.length] }]}>
                <Text style={[styles.medExtractName, { color: colors.foreground }]}>{med.name}</Text>
                <Text style={[styles.medExtractDosage, { color: colors.mutedForeground }]}>
                  {med.dosage} · {med.frequency}
                </Text>
                <Text style={[styles.medExtractInstructions, { color: colors.mutedForeground }]}>
                  {med.simplifiedInstructions}
                </Text>
              </View>
            ))}

            <TouchableOpacity onPress={handleAddAll} style={[styles.addAllBtn, { backgroundColor: colors.primary }]}>
              <Feather name="plus-circle" size={18} color="#fff" />
              <Text style={styles.addAllText}>Add All to Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setImage(null); setExtracted(null); }} style={[styles.retryBtn, { borderColor: colors.border }]}>
              <Text style={[styles.retryText, { color: colors.foreground }]}>Scan Another</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" flash={flashMode as "on" | "off"} />
      
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
  retryBtn: { paddingVertical: 16, borderRadius: 16, alignItems: "center", borderWidth: 1 },
  retryText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
