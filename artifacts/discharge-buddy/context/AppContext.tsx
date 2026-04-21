import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Language } from "@/constants/translations";
import { MockProvider } from "./MockProvider";
import { ApiProvider } from "./ApiProvider";
import type { IDataProvider } from "./types";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { router } from "expo-router";

export type UserRole = "patient" | "caregiver" | null;
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
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
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
  // Drug interactions
  drugInteractions: DrugInteraction[];
  // Actions
  setRole: (role: UserRole) => void;
  setUser: (user: AppUser) => void;
  addMedicine: (medicine: Medicine) => void;
  updateDoseStatus: (doseId: string, status: DoseLog["status"], snoozeMinutes?: number) => void;
  addSymptomLog: (log: SymptomLog) => void;
  addFollowUp: (followUp: FollowUp) => void;
  completeFollowUp: (id: string) => void;
  setOnboarded: (val: boolean) => void;
  setHapticsEnabled: (val: boolean) => void;
  triggerEmergency: () => void;
  setLanguage: (lang: Language) => void;
  addPrescription: (imageBase64: string) => Promise<PrescriptionAnalysisResult>;
  addJournalEntry: (entry: JournalEntry) => void;
  awardXP: (amount: number) => void;
  unlockAchievement: (id: string) => void;
  login: (user: AppUser, token: string) => Promise<void>;
  logout: () => void;
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
  const [streak, setStreak] = useState(7);
  const [xp, setXP] = useState(340);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [doseHistory, setDoseHistory] = useState<DoseHistoryDay[]>([]);
  const [lastXPGain, setLastXPGain] = useState(0);
  const [linkedPatients, setLinkedPatients] = useState<Patient[]>([]);

  const [dataProvider, setDataProvider] = useState<IDataProvider>(new MockProvider());
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Shared initialization of base URL and token getter
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
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
    } catch (err) {
        console.error("Failed to load generic data", err);
    }
  }

  async function saveData(updates: Record<string, unknown>) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : {};
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...updates }));
    } catch {}
  }

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

  const addMedicine = (medicine: Medicine) => {
    const updated = [...medicines, medicine];
    setMedicines(updated);
    saveData({ medicines: updated });
  };

  const updateDoseStatus = async (doseId: string, status: DoseLog["status"], snoozeMinutes?: number) => {
    await dataProvider.updateDoseStatus(doseId, status, snoozeMinutes);
    
    // Optimistic UI update
    setTodayDoses((prev) => {
      const updated = prev.map((d) =>
        d.id === doseId ? { ...d, status, takenAt: status === "taken" ? new Date().toISOString() : undefined } : d
      );
      if (status === "taken") {
        awardXP(10);
        unlockAchievement("first_dose");
        const allTaken = updated.filter((d) => d.date === new Date().toISOString().split("T")[0]).every((d) => d.status === "taken");
        if (allTaken) {
          awardXP(40);
          unlockAchievement("full_day");
        }
      }
      return updated;
    });
  };

  const addSymptomLog = async (log: SymptomLog) => {
    await dataProvider.addSymptomLog(log);
    
    setSymptomLogs([log, ...symptomLogs]);
    awardXP(15);
    unlockAchievement("symptom_logger");
  };

  const addFollowUp = async (followUp: FollowUp) => {
    setFollowUps([followUp, ...followUps]);
  };

  const completeFollowUp = async (id: string) => {
    await dataProvider.completeFollowUp(id);
    
    setFollowUps(followUps.map((f) => (f.id === id ? { ...f, completed: true } : f)));
    awardXP(25);
    unlockAchievement("follow_up");
  };

  const addJournalEntry = async (entry: JournalEntry) => {
    await dataProvider.addJournalEntry(entry);
    
    setJournalEntries([entry, ...journalEntries]);
    awardXP(20);
    unlockAchievement("journal_keeper");
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

  const checkInteractions = (meds: Medicine[]): DrugInteraction[] => {
    const ids = meds.map((m) => m.id);
    return DRUG_INTERACTIONS.filter((i) => i.medIds.every((id) => ids.includes(id)));
  };

  const login = async (userData: AppUser, token: string) => {
    await AsyncStorage.setItem("discharge_buddy_token", token);
    setUser(userData);
    setRole(userData.role);
    setDataProvider(new ApiProvider());
  };

  const logout = () => {
    AsyncStorage.removeItem("discharge_buddy_token");
    AsyncStorage.removeItem(STORAGE_KEY);
    setUserState(null);
    setRoleState(null);
    setDataProvider(new MockProvider());
    router.replace("/login");
  };

  return (
    <AppContext.Provider
      value={{
        user, role, patient: null, medicines, todayDoses, symptomLogs, followUps,
        isOnboarded, language, linkedPatients, isProcessingPrescription,
        hapticsEnabled,
        streak, xp, achievements, doseHistory, lastXPGain, journalEntries,
        drugInteractions: checkInteractions(medicines),
        setRole, setUser, addMedicine, updateDoseStatus, addSymptomLog, addFollowUp,
        completeFollowUp, setOnboarded, setHapticsEnabled, triggerEmergency, setLanguage, addPrescription,
        addJournalEntry, awardXP, unlockAchievement, login, logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export { ALL_ACHIEVEMENTS, DRUG_INTERACTIONS, XP_LEVELS };
