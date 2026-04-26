import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Language } from "@/constants/translations";
import { MockProvider } from "./MockProvider";
import { ApiProvider } from "./ApiProvider";
import type { IDataProvider } from "./types";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { router } from "expo-router";
import { scheduleMedicineNotifications, requestNotificationPermissions } from "@/utils/NotificationHelper";
import { NotificationToast } from "@/components/NotificationToast";
import { soundHelper } from "@/utils/SoundHelper";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";

export type UserRole = "patient" | "caregiver" | "family" | null;
// Language type imported from translations.ts

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  instructions: string;
  simplifiedInstructions: string;
  startDate: string;
  endDate?: string;
  color: string;
  totalPills?: number;
}

export interface DoseLog {
  id: string;
  medicineId: string;
  medicineName: string;
  scheduledTime: string;
  takenAt?: string;
  status: "taken" | "missed" | "pending" | "snoozed";
  date: string;
}

export interface SymptomLog {
  id: string;
  date: string;
  symptoms: string[];
  severity: number;
  notes: string;
  riskLevel: "low" | "medium" | "high";
}

export interface FollowUp {
  id: string;
  title: string;
  doctorName: string;
  dateTime: string;
  location: string;
  notes: string;
  completed: boolean;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  condition: string;
  dischargeDate: string;
  medicines: Medicine[];
  doseLogs: DoseLog[];
  symptomLogs: SymptomLog[];
  followUps: FollowUp[];
  emergencyContact: string;
  riskScore?: number;
  riskLevel?: "Low" | "Moderate" | "High";
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  linkedPatientId?: string;
  bloodType?: string;
  allergies?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  mood: number;
  energy: number;
  text: string;
}

export interface DoseHistoryDay {
  date: string;
  taken: number;
  total: number;
  percentage: number;
}

export interface DrugInteraction {
  medIds: string[];
  severity: "mild" | "moderate" | "high";
  description: string;
}

export interface ExtractedMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  timing: string;
  notes: string;
  confidence: number;
  low_confidence: boolean;
  simplifiedInstructions?: string;
  times?: string[];
}

export interface PrescriptionAnalysisResult {
  medicines: ExtractedMedicine[];
  general_instructions: string;
  explanation: string;
  warnings: string[];
  overall_confidence: number;
  ocr_source: string;
  processing_note: string;
}

export type NotifItem = {
  id: string;
  icon: any;
  color: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
};

export type NotifGroup = {
  group: string;
  items: NotifItem[];
};

const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: "first_dose", title: "First Step", description: "Take your first medicine", icon: "💊", xpReward: 50 },
  { id: "streak_3", title: "On a Roll", description: "3-day adherence streak", icon: "🔥", xpReward: 75 },
  { id: "streak_7", title: "Week Warrior", description: "7-day streak — impressive!", icon: "⚡", xpReward: 150 },
  { id: "streak_30", title: "Month Master", description: "30-day streak — legendary!", icon: "🏆", xpReward: 500 },
  { id: "symptom_logger", title: "Health Tracker", description: "Log your first symptom", icon: "📊", xpReward: 40 },
  { id: "journal_keeper", title: "Journal Keeper", description: "Write your first journal entry", icon: "📝", xpReward: 40 },
  { id: "scan_master", title: "Scan Master", description: "Scan a prescription", icon: "📷", xpReward: 60 },
  { id: "full_day", title: "Perfect Day", description: "Take ALL doses in one day", icon: "⭐", xpReward: 100 },
  { id: "follow_up", title: "Appointment Pro", description: "Complete a follow-up", icon: "📅", xpReward: 80 },
  { id: "week_perfect", title: "Superstar", description: "Perfect adherence for 7 days", icon: "🌟", xpReward: 300 },
];

const DRUG_INTERACTIONS: DrugInteraction[] = [
  {
    medIds: ["m1", "m3"],
    severity: "mild",
    description: "Metformin + Aspirin may slightly increase hypoglycemia risk. Monitor blood sugar closely.",
  },
  {
    medIds: ["m2", "m4"],
    severity: "mild",
    description: "Lisinopril + Atorvastatin: monitor for muscle weakness or pain.",
  },
  {
    medIds: ["m3", "m4"],
    severity: "mild",
    description: "Aspirin + Atorvastatin: generally safe but watch for unusual bleeding.",
  },
];

const XP_LEVELS = [
  { level: 1, title: "Recovery Starter", min: 0, max: 150 },
  { level: 2, title: "Getting Stronger", min: 150, max: 400 },
  { level: 3, title: "Dedicated Patient", min: 400, max: 800 },
  { level: 4, title: "Health Champion", min: 800, max: 1500 },
  { level: 5, title: "Recovery Master", min: 1500, max: 9999 },
];

export function getLevel(xp: number) {
  return XP_LEVELS.find((l) => xp >= l.min && xp < l.max) ?? XP_LEVELS[XP_LEVELS.length - 1];
}

interface AppContextType {
  user: AppUser | null;
  role: UserRole;
  patient: Patient | null;
  medicines: Medicine[];
  todayDoses: DoseLog[];
  symptomLogs: SymptomLog[];
  followUps: FollowUp[];
  isOnboarded: boolean;
  language: Language;
  linkedPatients: Patient[];
  isProcessingPrescription: boolean;
  hapticsEnabled: boolean;
  // Gamification
  streak: number;
  xp: number;
  achievements: Achievement[];
  doseHistory: DoseHistoryDay[];
  lastXPGain: number;
  // Journal
  journalEntries: JournalEntry[];
  // Notifications
  notifications: NotifGroup[];
  // Drug interactions
  drugInteractions: DrugInteraction[];
  recoverySuggestion: { title: string; body: string; type: 'calm' | 'sleep' | 'reset' } | null;
  // Actions
  setRole: (role: UserRole) => void;
  setUser: (user: AppUser) => void;
  addMedicine: (medicine: Omit<Medicine, "id">) => Promise<void>;
  updateMedicine: (id: string, medicine: Partial<Medicine>) => Promise<void>;
  deleteMedicine: (id: string) => Promise<void>;
  updateDoseStatus: (doseId: string, status: DoseLog["status"], snoozeMinutes?: number) => void;
  addSymptomLog: (log: SymptomLog) => void;
  addFollowUp: (followUp: FollowUp) => void;
  getRecoveryTrends: () => Promise<any>;
  simplifyInstruction: (text: string) => Promise<string>;
  completeFollowUp: (id: string) => void;
  setOnboarded: (val: boolean) => void;
  setHapticsEnabled: (val: boolean) => void;
  triggerEmergency: () => void;
  setLanguage: (lang: Language) => void;
  addPrescription: (imageBase64: string) => Promise<PrescriptionAnalysisResult>;
  addJournalEntry: (entry: JournalEntry) => void;
  awardXP: (amount: number) => void;
  unlockAchievement: (id: string) => void;
  updateProfile: (updates: Partial<AppUser>) => Promise<void>;
  changePassword: (old: string, newP: string) => Promise<void>;
  clearAllNotifications: () => void;
  markNotificationRead: (id: string) => void;
  login: (user: AppUser, token: string) => Promise<void>;
  logout: () => void;
  resetOnboarding: () => void;
  switchProvider: (provider: IDataProvider) => void;
  clearRecoverySuggestion: () => void;
  refreshData: () => Promise<void>;
  api: IDataProvider;
  showToast: (title: string, body: string) => void;
  addNotification: (item: Omit<NotifItem, "id" | "read" | "time">) => void;
  fetchBriefing: (patientId: string) => Promise<string>;
  isSpeaking: boolean;
  speakingTargetId: string | null;
  speakNeural: (text: string, targetId?: string) => Promise<void>;
  stopSpeaking: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = "discharge_buddy_data_v2";

// Dummy items moved to DataProvider implementations

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AppUser | null>(null);
  const [role, setRoleState] = useState<UserRole>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [todayDoses, setTodayDoses] = useState<DoseLog[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isOnboarded, setIsOnboardedState] = useState(false);
  const [language, setLanguageState] = useState<Language>("en");
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const [isProcessingPrescription, setIsProcessingPrescription] = useState(false);
  const [streak, setStreak] = useState(0);
  const [xp, setXP] = useState(340);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [doseHistory, setDoseHistory] = useState<DoseHistoryDay[]>([]);
  const [lastXPGain, setLastXPGain] = useState(0);
  const [linkedPatients, setLinkedPatients] = useState<Patient[]>([]);
  const [notifications, setNotifications] = useState<NotifGroup[]>([]);
  const [toast, setToast] = useState<{ visible: boolean; title: string; body: string }>({
    visible: false,
    title: "",
    body: "",
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingTargetId, setSpeakingTargetId] = useState<string | null>(null);
  const audioRef = useRef<Audio.Sound | null>(null);

  const [dataProvider, setDataProvider] = useState<IDataProvider>(new MockProvider());
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Shared initialization of base URL and token getter
    // On physical devices (Expo Go), localhost won't work. 
    // You should set EXPO_PUBLIC_API_URL to your machine's local IP (e.g., http://192.168.1.5:3000)
    let apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:3000"; // Default for Android Emulator
    if (Platform.OS === "ios") {
      apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
    }
    if (Platform.OS === "web") {
      apiUrl = "http://localhost:3000";
    }
    setBaseUrl(apiUrl);
    setAuthTokenGetter(async () => await AsyncStorage.getItem("discharge_buddy_token"));
    initApp();
  }, []);

  useEffect(() => {
    if (!isInitializing) {
      loadData();
    }
  }, [dataProvider, isInitializing]);

  async function initApp() {
    try {
      const token = await AsyncStorage.getItem("discharge_buddy_token");
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (token && dataProvider instanceof MockProvider) {
          setDataProvider(new ApiProvider());
      }

      // Request notification permission on native (local notifications work in Expo Go, remote push does not)
      if (Platform.OS !== "web") {
        await requestNotificationPermissions();
        // Note: getExpoPushTokenAsync() is not supported in Expo Go SDK 53+.
        // Push tokens are registered when running a development build or production build.
      }

      if (raw) {
        const data = JSON.parse(raw);
        if (data.role) setRoleState(data.role);
        if (data.user) setUserState(data.user);
        if (data.isOnboarded !== undefined) setIsOnboardedState(data.isOnboarded);
        if (data.hapticsEnabled !== undefined) setHapticsEnabledState(data.hapticsEnabled);
        if (data.language) setLanguageState(data.language);
        if (data.streak) setStreak(data.streak);
        if (data.xp) setXP(data.xp);
        if (data.achievements) setAchievements(data.achievements);
        if (data.notifications) setNotifications(data.notifications);
        else {
          // Default notifications if none saved
          setNotifications([
            {
              group: "Today",
              items: [
                { id: "n1", icon: "check-circle", color: "#10b981", title: "Dose Taken", body: "Lisinopril 10mg — marked as taken", time: "8:03 AM", read: false },
                { id: "n2", icon: "alert-triangle", color: "#f59e0b", title: "Missed Dose", body: "Aspirin 81mg — you missed your evening dose", time: "8:00 PM", read: false },
                { id: "n3", icon: "calendar", color: "#8b5cf6", title: "Upcoming Appointment", body: "Dr. Smith — tomorrow at 10:00 AM", time: "3:00 PM", read: false },
              ],
            },
            {
              group: "Yesterday",
              items: [
                { id: "n4", icon: "activity", color: "#ef4444", title: "Symptom Alert", body: "Chest pain logged — consider calling your doctor", time: "2:15 PM", read: true },
                { id: "n5", icon: "check-circle", color: "#10b981", title: "All Doses Taken", body: "Great job! You had 100% adherence yesterday", time: "10:00 PM", read: true },
              ],
            },
          ]);
        }
      }
    } catch (err) {
      console.error("Failed to initialize app state", err);
    } finally {
      setIsInitializing(false);
    }
  }

  async function loadData() {
    try {
      const dbMedicines = await dataProvider.getMedicines();
      setMedicines(dbMedicines);

      const dbTodayDoses = await dataProvider.getTodayDoses();
      setTodayDoses(dbTodayDoses);

      const dbSymptoms = await dataProvider.getSymptomLogs();
      setSymptomLogs(dbSymptoms);

      const dbFollowUps = await dataProvider.getFollowUps();
      setFollowUps(dbFollowUps);

      const dbJournal = await dataProvider.getJournalEntries();
      setJournalEntries(dbJournal);

      const dbPatients = await dataProvider.getLinkedPatients();
      setLinkedPatients(dbPatients);

      const dbTrends = await dataProvider.getRecoveryTrends();
      
      const dbAdherenceHistory = await dataProvider.getAdherenceHistory();
      const historyFormatted = dbAdherenceHistory.map(h => ({
        date: h.date,
        taken: h.taken || 0,
        total: h.total || 0,
        percentage: h.percentage || 0
      }));
      setDoseHistory(historyFormatted);

      // Calculate dynamic streak based on adherence history
      let currentStreak = 0;
      const sortedHistory = [...historyFormatted].sort((a, b) => b.date.localeCompare(a.date));
      const todayStr = new Date().toISOString().split("T")[0];
      
      let streakIndex = 0;
      if (sortedHistory[0]?.date === todayStr) {
        if (sortedHistory[0].taken > 0) {
          currentStreak++;
        }
        streakIndex = 1; // move to yesterday
      }

      for (; streakIndex < sortedHistory.length; streakIndex++) {
        const day = sortedHistory[streakIndex];
        if (day.taken > 0) {
          currentStreak++;
        } else if (day.total > 0 && day.taken === 0) {
          break; // Streak broken
        }
      }
      setStreak(currentStreak);
      // Handle setting trends state if added to context
    } catch (err) {
      // Graceful handling of network failures to prevent "Red Screen of Death"
      if (err instanceof TypeError && err.message.includes("Network request failed")) {
        console.warn("Backend server unreachable. Using local cache if available.");
      } else {
        console.error("Failed to load generic data", err);
      }
    }
  }

  async function saveData(updates: Record<string, unknown>) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : {};
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...updates }));
    } catch {}
  }

  const [recoverySuggestion, setRecoverySuggestion] = useState<{ title: string; body: string; type: 'calm' | 'sleep' | 'reset' } | null>(null);

  // Recovery Suggestion Logic
  useEffect(() => {
    if (role !== 'patient') return;
    
    const checkSuggestions = () => {
      // Rule 1: Missed Dose
      const missedCount = todayDoses.filter(d => d.status === 'missed').length;
      if (missedCount >= 1) {
        setRecoverySuggestion({
          title: "Feeling overwhelmed?",
          body: "Take a 2-min reset to calm your mind.",
          type: 'calm'
        });
        return;
      }

      // Rule 2: Night Time (Sleep Prep)
      const hour = new Date().getHours();
      if (hour >= 21) {
        setRecoverySuggestion({
          title: "Prepare for sleep",
          body: "Wind down for better recovery tonight.",
          type: 'sleep'
        });
        return;
      }
      
      setRecoverySuggestion(null);
    };

    checkSuggestions();
  }, [todayDoses, role]);

  const clearRecoverySuggestion = () => setRecoverySuggestion(null);

  const awardXP = useCallback((amount: number) => {
    setLastXPGain(amount);
    setXP((prev) => {
      const next = prev + amount;
      saveData({ xp: next });
      return next;
    });
    setTimeout(() => setLastXPGain(0), 2000);
  }, []);

  const unlockAchievement = useCallback((id: string) => {
    setAchievements((prev) => {
      if (prev.find((a) => a.id === id)?.unlockedAt) return prev;
      const template = ALL_ACHIEVEMENTS.find((a) => a.id === id);
      if (!template) return prev;
      const updated = prev.map((a) =>
        a.id === id ? { ...a, unlockedAt: new Date().toISOString() } : a
      );
      if (!prev.find((a) => a.id === id)) {
        updated.push({ ...template, unlockedAt: new Date().toISOString() });
      }
      saveData({ achievements: updated });
      return updated;
    });
    const template = ALL_ACHIEVEMENTS.find((a) => a.id === id);
    if (template) awardXP(template.xpReward);
  }, [awardXP]);

  const setRole = (r: UserRole) => { setRoleState(r); saveData({ role: r }); };
  const setUser = (u: AppUser) => { setUserState(u); saveData({ user: u }); };
  const setOnboarded = (val: boolean) => { setIsOnboardedState(val); saveData({ isOnboarded: val }); };
  const setHapticsEnabled = (val: boolean) => { setHapticsEnabledState(val); saveData({ hapticsEnabled: val }); };
  const setLanguage = (lang: Language) => { setLanguageState(lang); saveData({ language: lang }); };

  const addMedicine = async (medData: Omit<Medicine, "id">) => {
    const newMed = await dataProvider.addMedicine(medData);
    // Schedule local notifications for each dose time as a device-side fallback
    if (newMed && Platform.OS !== "web") {
      await scheduleMedicineNotifications(newMed).catch(console.warn);
    }
    await loadData();
    unlockAchievement("first_step");
  };

  const updateMedicine = async (id: string, updates: Partial<Medicine>) => {
    await dataProvider.updateMedicine?.(id, updates);
    // Reschedule notifications with new times
    if (updates.times && Platform.OS !== "web") {
      const updatedMed = medicines.find(m => m.id === id);
      if (updatedMed) {
        await scheduleMedicineNotifications({ ...updatedMed, ...updates } as Medicine).catch(console.warn);
      }
    }
    await loadData();
  };

  const deleteMedicine = async (id: string) => {
    await dataProvider.deleteMedicine?.(id);
    await loadData();
  };

  const updateDoseStatus = async (doseId: string, status: DoseLog["status"], snoozeMinutes?: number) => {
    await dataProvider.updateDoseStatus(doseId, status, snoozeMinutes);
    
    // Optimistic UI update
    setTodayDoses((prev) => {
      const updated = prev.map((d) =>
        d.id === doseId ? { ...d, status, takenAt: status === "taken" ? new Date().toISOString() : undefined } : d
      );
      if (status === "taken") {
        soundHelper.playTing();
        awardXP(10);
        unlockAchievement("first_dose");
        const allTaken = updated.filter((d) => d.date === new Date().toISOString().split("T")[0]).every((d) => d.status === "taken");
        if (allTaken) {
          awardXP(40);
          unlockAchievement("full_day");
        }

        // Update dose history for today and recalculate streak
        setDoseHistory(prevHistory => {
          const todayStr = new Date().toISOString().split("T")[0];
          const newHistory = prevHistory.map(h => {
            if (h.date === todayStr) {
              const newTaken = h.taken + 1;
              return { ...h, taken: newTaken, percentage: h.total > 0 ? Math.round((newTaken / h.total) * 100) : 0 };
            }
            return h;
          });

          // Recalculate streak
          let currentStreak = 0;
          const sortedHistory = [...newHistory].sort((a, b) => b.date.localeCompare(a.date));
          let streakIndex = 0;
          if (sortedHistory[0]?.date === todayStr) {
            if (sortedHistory[0].taken > 0) currentStreak++;
            streakIndex = 1;
          }
          for (; streakIndex < sortedHistory.length; streakIndex++) {
            const day = sortedHistory[streakIndex];
            if (day.taken > 0) currentStreak++;
            else if (day.total > 0 && day.taken === 0) break;
          }
          
          // Avoid a React warning by setting state outside of another set state call if possible, 
          // but since this is inside setDoseHistory it's okay, React batches it.
          setStreak(currentStreak);
          return newHistory;
        });

        // Add to notification log
        const med = medicines.find(m => m.id === doseId) || updated.find(d => d.id === doseId);
        const name = med ? ('name' in med ? med.name : med.medicineName) : "Medicine";
        
        addNotification({
          title: "Dose Taken",
          body: `${name} — marked as taken`,
          icon: "check-circle",
          color: "#10b981"
        });
      }
      return updated;
    });
  };

  const addSymptomLog = async (log: SymptomLog) => {
    await dataProvider.addSymptomLog(log);
    
    setSymptomLogs([log, ...symptomLogs]);
    awardXP(15);
    unlockAchievement("symptom_logger");
    addNotification({
      title: "Symptom Logged",
      body: `${log.symptoms.length} symptoms recorded`,
      icon: "activity",
      color: "#ef4444"
    });
  };

  const addFollowUp = async (followUp: FollowUp) => {
    await dataProvider.addFollowUp(followUp);
    setFollowUps([followUp, ...followUps]);
  };

  const completeFollowUp = async (id: string) => {
    await dataProvider.completeFollowUp(id);
    
    setFollowUps(followUps.map((f) => (f.id === id ? { ...f, completed: true } : f)));
    awardXP(25);
    unlockAchievement("follow_up");
  };

  const addJournalEntry = async (journalEntry: JournalEntry) => {
    await dataProvider.addJournalEntry(journalEntry);
    
    setJournalEntries([journalEntry, ...journalEntries]);
    awardXP(20);
    unlockAchievement("journal_keeper");
    addNotification({
      title: "Journal Entry Added",
      body: "Your daily reflections have been saved",
      icon: "book-open",
      color: "#8b5cf6"
    });
  };

  const triggerEmergency = async () => {
    await dataProvider.triggerEmergency();
    console.log("EMERGENCY ACTUALLY TRIGGERED AND SENT TO BACKEND");
  };

  const addPrescription = async (imageBase64: string): Promise<PrescriptionAnalysisResult> => {
    setIsProcessingPrescription(true);
    try {
      const result = await dataProvider.scanPrescription(imageBase64);
      unlockAchievement("scan_master");
      return result;
    } finally {
      setIsProcessingPrescription(false);
    }
  };

  const getRecoveryTrends = async () => {
    return await dataProvider.getRecoveryTrends();
  };

  const simplifyInstruction = async (text: string) => {
    return await dataProvider.simplifyInstruction(text);
  };



  const stopSpeaking = useCallback(async () => {
    try {
      // Stop remote audio
      if (audioRef.current) {
        await audioRef.current.stopAsync();
        await audioRef.current.unloadAsync();
        audioRef.current = null;
      }
    } catch (e) {
      console.warn("Could not stop speech:", e);
    }
    setIsSpeaking(false);
    setSpeakingTargetId(null);
  }, []);

  const speakNeural = async (text: string, targetId?: string) => {
    if (!text) return;

    // If already speaking the same thing, stop it
    if (isSpeaking && speakingTargetId === targetId) {
      stopSpeaking();
      return;
    }

    // Stop any current speech before starting new
    await stopSpeaking();

    if (hapticsEnabled && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsSpeaking(true);
    if (targetId) setSpeakingTargetId(targetId);
    
    // Filter out emojis and special symbols so they aren't read aloud literally
    const cleanText = text
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2300}-\u{23FF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    try {
      // 1. Fetch with 1-retry logic
      const fetchWithRetry = async (attempt = 0): Promise<string> => {
        const token = await AsyncStorage.getItem("discharge_buddy_token");
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
        
        const res = await fetch(`${apiUrl}/api/ai/tts`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ text: cleanText })
        });

        if (res.ok) {
          const data = await res.json();
          return data.audioContent;
        }

        if (attempt < 1) return fetchWithRetry(attempt + 1);
        throw new Error("ElevenLabs TTS failed after retry");
      };

      const audioContent = await fetchWithRetry();
      const uri = `data:audio/mpeg;base64,${audioContent}`;
      
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, pitchCorrectionQuality: Audio.PitchCorrectionQuality.High }
      );
      
      audioRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsSpeaking(false);
          setSpeakingTargetId(null);
          sound.unloadAsync();
          audioRef.current = null;
        }
      });
    } catch (err) {
      console.error("[TTS Error]", err);
      // Fallback: Just show text (logic is already showing text in UI)
      setIsSpeaking(false);
      setSpeakingTargetId(null);
    }
  };

  const fetchBriefing = async (patientId: string) => {
    try {
      const token = await AsyncStorage.getItem("discharge_buddy_token");
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${apiUrl}/api/caregiver/briefing/${patientId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch briefing");
      const data = await res.json();
      return data.summary;
    } catch (err) {
      console.error("Briefing Fetch Error:", err);
      return "Unable to load patient briefing at this time.";
    }
  };

  const checkInteractions = (meds: Medicine[]): DrugInteraction[] => {
    const ids = meds.map((m) => m.id);
    return DRUG_INTERACTIONS.filter((i) => i.medIds.every((id) => ids.includes(id)));
  };

  const login = async (userData: AppUser, token: string) => {
    await AsyncStorage.setItem("discharge_buddy_token", token);
    setUser(userData);
    setRole(userData.role);
    setDataProvider(new ApiProvider());

    // Register Push Token with Backend
    try {
      const { getDevicePushToken } = await import("@/utils/NotificationHelper");
      const pushToken = await getDevicePushToken();
      if (pushToken) {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
        await fetch(`${apiUrl}/api/auth/push-token`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ token: pushToken })
        });
        console.log("Push token registered successfully with backend");
      }
    } catch (err) {
      console.warn("Failed to register push token during login:", err);
    }
  };

  const logout = () => {
    AsyncStorage.removeItem("discharge_buddy_token");
    AsyncStorage.removeItem(STORAGE_KEY);
    setUserState(null);
    setRoleState(null);
    setDataProvider(new MockProvider());
    router.replace("/login");
  };

  const updateProfile = async (updates: Partial<AppUser>) => {
    const updatedUser = await dataProvider.updateProfile(updates);
    setUserState(updatedUser);
    saveData({ user: updatedUser });
  };

  const changePassword = async (old: string, newP: string) => {
    await dataProvider.changePassword(old, newP);
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    saveData({ notifications: [] });
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(g => ({
        ...g,
        items: g.items.map(i => i.id === id ? { ...i, read: true } : i)
      }));
      saveData({ notifications: updated });
      return updated;
    });
  };

  const showToast = useCallback((title: string, body: string) => {
    setToast({ visible: true, title, body });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  const addNotification = useCallback((item: Omit<NotifItem, "id" | "read" | "time">) => {
    const newItem: NotifItem = {
      ...item,
      id: Date.now().toString(),
      read: false,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setNotifications(prev => {
      let updated = [...prev];
      if (updated.length === 0 || updated[0].group !== "Today") {
        updated.unshift({ group: "Today", items: [newItem] });
      } else {
        updated[0] = { ...updated[0], items: [newItem, ...updated[0].items] };
      }
      saveData({ notifications: updated });
      return updated;
    });

    // Also trigger a visual toast for immediate feedback
    showToast(item.title, item.body);
  }, [showToast]);

  const resetOnboarding = () => {
    setIsOnboardedState(false);
    saveData({ isOnboarded: false });
  };

  const switchProvider = (provider: IDataProvider) => {
    setDataProvider(provider);
  };

  return (
    <AppContext.Provider
      value={{
        user, role, patient: null, medicines, todayDoses, symptomLogs, followUps,
        isOnboarded, language, linkedPatients, isProcessingPrescription,
        hapticsEnabled,
        streak, xp, achievements, doseHistory, lastXPGain, journalEntries,
        drugInteractions: checkInteractions(medicines),
        recoverySuggestion,
        setRole, setUser, addMedicine, updateMedicine, deleteMedicine, updateDoseStatus, addSymptomLog, addFollowUp,
        completeFollowUp, setOnboarded, setHapticsEnabled, triggerEmergency, setLanguage, addPrescription,
        addJournalEntry, awardXP, unlockAchievement, login, logout, resetOnboarding, switchProvider,
        getRecoveryTrends, simplifyInstruction, updateProfile, changePassword,
        notifications, clearAllNotifications, markNotificationRead, addNotification,
        clearRecoverySuggestion,
        refreshData: loadData,
        api: dataProvider,
        showToast,
        fetchBriefing,
        isSpeaking,
        speakingTargetId,
        speakNeural,
        stopSpeaking,
      }}
    >
      {children}
      <NotificationToast 
        visible={toast.visible}
        title={toast.title}
        body={toast.body}
        onHide={hideToast}
      />
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export { ALL_ACHIEVEMENTS, DRUG_INTERACTIONS, XP_LEVELS };
