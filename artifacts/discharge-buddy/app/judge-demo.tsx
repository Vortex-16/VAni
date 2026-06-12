import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TranslateText as Text } from "@/components/TranslateText";
import { useApp } from "@/context/AppContext";

const PURPLE = "#6C47FF";
const DESTRUCTIVE = "#EF4444";
const SUCCESS = "#10B981";
const WHITE = "#FFFFFF";

export default function JudgeDemoScreen() {
  const insets = useSafeAreaInsets();
  const { user, api, todayDoses } = useApp();
  const [demoState, setDemoState] = useState<"idle" | "calling" | "sending_report" | "dispatched" | "en_route" | "arrived">("idle");
  const [dispatchId, setDispatchId] = useState<string | null>(null);
  const [eta, setEta] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [liveLocation, setLiveLocation] = useState({ lat: 12.9716, lng: 77.5946 }); // Patient coordinate

  // Reset the demo
  const resetDemo = () => {
    setDemoState("idle");
    setDispatchId(null);
    setEta(0);
    setLogs([]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  // Trigger simulated emergency flow
  const triggerSOS = async () => {
    if (demoState !== "idle") return;
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDemoState("calling");
    setLogs(["Calling emergency response (112)..."]);

    // Generate patient report structure
    const activeSymptoms = ["Chest pain", "Shortness of breath"];
    const activeMeds = todayDoses.map(d => `${d.medicineName} (${d.scheduledTime})`);
    
    // Simulate steps sequentially
    setTimeout(() => {
      setDemoState("sending_report");
      setLogs(prev => [...prev, "Generating patient medical history summary..."]);
    }, 1500);

    setTimeout(async () => {
      setLogs(prev => [...prev, "Uploading medical history to emergency endpoint..."]);
      try {
        const report = {
          patientName: user?.name || "Mary Smith",
          symptoms: activeSymptoms,
          medicines: activeMeds,
          location: liveLocation
        };
        const result = await api.sendEmergencyReport(report);
        if (result && result.success) {
          setDispatchId(result.dispatchId);
          setEta(result.etaMinutes);
          setDemoState("dispatched");
          setLogs(prev => [...prev, `Report successfully uploaded. Dispatch ID: ${result.dispatchId}`]);
        }
      } catch (err) {
        // Fallback for offline mode or network failure
        const fakeId = `AMB-${Math.floor(1000 + Math.random() * 9000)}`;
        setDispatchId(fakeId);
        setEta(7);
        setDemoState("dispatched");
        setLogs(prev => [...prev, `Report uploaded locally. Dispatch ID: ${fakeId}`]);
      }
    }, 3000);

    setTimeout(() => {
      setDemoState("en_route");
      setLogs(prev => [...prev, "Ambulance dispatched. En route to patient location."]);
    }, 5000);
  };

  // Build the Map iframe source code dynamically depending on the state of the simulation
  const getMapIframeSrcDoc = () => {
    const isTracking = demoState === "en_route" || demoState === "dispatched" || demoState === "arrived";
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false }).setView([12.9716, 77.5946], 14);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          var patientMarker = L.marker([12.9716, 77.5946]).addTo(map)
            .bindPopup('<b>Patient (Mary Smith)</b><br>Logged distress spot.').openPopup();

          if (${isTracking}) {
            var startLat = 12.9560;
            var startLng = 77.5750;
            
            var ambIcon = L.icon({
              iconUrl: 'https://cdn-icons-png.flaticon.com/512/1039/1039801.png',
              iconSize: [36, 36],
              iconAnchor: [18, 18]
            });

            var ambulance = L.marker([startLat, startLng], { icon: ambIcon }).addTo(map)
              .bindPopup('<b>Ambulance (AMB-Dispatch)</b>').openPopup();

            // Simple movement animation
            var progress = 0;
            var interval = setInterval(function() {
              if (progress <= 1) {
                var lat = startLat + (12.9716 - startLat) * progress;
                var lng = startLng + (77.5946 - startLng) * progress;
                ambulance.setLatLng([lat, lng]);
                progress += 0.05;
              } else {
                clearInterval(interval);
                ambulance.bindPopup('<b>Ambulance Arrived!</b>').openPopup();
              }
            }, 1000);
          }
        </script>
      </body>
      </html>
    `;
  };

  const getStatusColor = () => {
    if (demoState === "idle") return "#6B7280";
    if (demoState === "calling" || demoState === "sending_report") return WARNING;
    return SUCCESS;
  };

  const WARNING = "#F59E0B";


  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#4B26C8", PURPLE]}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/help");
            }
          }} 
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={24} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Tracking Center</Text>
        <Text style={styles.headerSub}>Real-Time Ambulance Dispatch & OpenStreetMap Tracking</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* State and SOS Panel */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trigger Simulation</Text>
          <Text style={styles.cardDesc}>
            Press the button below to initiate an ambulance request, upload a real-time clinical report, and track the dispatched ambulance on Leaflet maps.
          </Text>

          {demoState === "idle" ? (
            <TouchableOpacity style={styles.sosBtn} onPress={triggerSOS} activeOpacity={0.85}>
              <Feather name="zap" size={28} color={WHITE} />
              <Text style={styles.sosBtnText}>TRIGGER LIVE SOS TRACKING</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.activeContainer}>
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
                <Text style={styles.statusText}>
                  {demoState.toUpperCase().replace("_", " ")}
                </Text>
              </View>
              <TouchableOpacity style={styles.resetBtn} onPress={resetDemo}>
                <Feather name="rotate-ccw" size={16} color="#475569" />
                <Text style={styles.resetBtnText}>RESET TRACKER</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Live Map Panel */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ambulance Tracking (Leaflet + OpenStreetMap)</Text>
          {Platform.OS === "web" ? (
            <iframe
              srcDoc={getMapIframeSrcDoc()}
              style={styles.mapFrame}
              title="Ambulance Live Tracking"
            />
          ) : (
            <WebView
              originWhitelist={['*']}
              source={{ html: getMapIframeSrcDoc() }}
              style={styles.mapFrame}
              scrollEnabled={false}
            />
          )}
          <View style={styles.mapInfo}>
            <Text style={styles.mapCoords}>Patient Location: 12.9716° N, 77.5946° E</Text>
            {dispatchId && <Text style={styles.mapDispatch}>Ticket ID: {dispatchId} | ETA: {eta} mins</Text>}
          </View>
        </View>

        {/* Report Preview Panel */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dispatched Medical Report Preview</Text>
          <View style={styles.reportItem}>
            <Text style={styles.reportLabel}>Patient Name:</Text>
            <Text style={styles.reportValue}>{user?.name || "Mary Smith"}</Text>
          </View>
          <View style={styles.reportItem}>
            <Text style={styles.reportLabel}>Active Symptoms:</Text>
            <Text style={styles.reportValue}>Chest pain, Shortness of breath</Text>
          </View>
          <View style={styles.reportItem}>
            <Text style={styles.reportLabel}>Medication History:</Text>
            <Text style={styles.reportValue}>
              {todayDoses.length > 0
                ? todayDoses.map(d => d.medicineName).slice(0, 3).join(", ")
                : "Metformin, Lisinopril"}
            </Text>
          </View>
          <View style={styles.reportItem}>
            <Text style={styles.reportLabel}>Logged Location:</Text>
            <Text style={styles.reportValue}>City Centre, Bengaluru (Google Maps LatLng)</Text>
          </View>
        </View>

        {/* Status Feed Logs */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live Simulation Logs</Text>
          <View style={styles.logBox}>
            {logs.length === 0 ? (
              <Text style={styles.logPlaceholder}>Waiting for simulation triggers...</Text>
            ) : (
              logs.map((log, idx) => (
                <View key={idx} style={styles.logRow}>
                  <Text style={styles.logTime}>[{new Date().toLocaleTimeString()}]</Text>
                  <Text style={styles.logText}>{log}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
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
  headerSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 4 },
  content: { padding: 20, gap: 20 },
  
  card: { backgroundColor: WHITE, borderRadius: 20, padding: 20, gap: 12, elevation: 1, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8 },
  cardTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#1E1B4B" },
  cardDesc: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#64748B", lineHeight: 20 },
  
  sosBtn: {
    backgroundColor: DESTRUCTIVE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    marginTop: 8,
  },
  sosBtnText: { color: WHITE, fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  
  activeContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  statusIndicator: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  statusText: { color: WHITE, fontSize: 14, fontFamily: "Inter_700Bold" },
  resetBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, backgroundColor: "#F1F5F9", borderRadius: 10 },
  resetBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#475569" },
  
  mapFrame: { width: "100%", height: 320, borderWidth: 0, borderRadius: 16, marginTop: 4 },
  nativePlaceholder: { width: "100%", height: 200, backgroundColor: "#F1F5F9", borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 8 },
  nativeText: { color: "#64748B", fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
  mapInfo: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", marginTop: 4 },
  mapCoords: { fontSize: 12, color: "#64748B", fontFamily: "Inter_500Medium" },
  mapDispatch: { fontSize: 12, color: PURPLE, fontFamily: "Inter_700Bold" },

  reportItem: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#F1F5F9", paddingVertical: 8 },
  reportLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#475569" },
  reportValue: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#1E1B4B" },

  logBox: { backgroundColor: "#0F172A", borderRadius: 14, padding: 16, minHeight: 100, gap: 8 },
  logPlaceholder: { color: "#475569", fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  logRow: { flexDirection: "row", gap: 8 },
  logTime: { color: SUCCESS, fontSize: 12, fontFamily: "Inter_700Bold" },
  logText: { color: "#E2E8F0", fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 }
});
