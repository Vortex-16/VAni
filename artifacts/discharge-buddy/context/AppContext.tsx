import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Language } from "@/constants/translations";

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
  updateDoseStatus: (doseId: string, status: DoseLog["status"]) => void;
  addSymptomLog: (log: SymptomLog) => void;
  addFollowUp: (followUp: FollowUp) => void;
  completeFollowUp: (id: string) => void;
  setOnboarded: (val: boolean) => void;
  setHapticsEnabled: (val: boolean) => void;
  triggerEmergency: () => void;
  setLanguage: (lang: Language) => void;
  addPrescription: (imageUri: string) => Promise<void>;
  addJournalEntry: (entry: JournalEntry) => void;
  awardXP: (amount: number) => void;
  unlockAchievement: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = "discharge_buddy_data_v2";

const DEMO_MEDICINES: Medicine[] = [
  {
    id: "m1",
    name: "Metformin",
    dosage: "500mg",
    frequency: "Twice daily",
    times: ["08:00", "20:00"],
    instructions: "Take with meals to reduce GI side effects. Monitor blood glucose regularly.",
    simplifiedInstructions: "Take this pill with breakfast and dinner. It helps control your blood sugar.",
    startDate: new Date().toISOString(),
    color: "#0891b2",
    totalPills: 60,
  },
  {
    id: "m2",
    name: "Lisinopril",
    dosage: "10mg",
    frequency: "Once daily",
    times: ["08:00"],
    instructions: "Take in the morning. Monitor blood pressure. Avoid NSAIDs.",
    simplifiedInstructions: "Take this pill every morning. It lowers your blood pressure. Avoid ibuprofen.",
    startDate: new Date().toISOString(),
    color: "#10b981",
    totalPills: 30,
  },
  {
    id: "m3",
    name: "Aspirin",
    dosage: "81mg",
    frequency: "Once daily",
    times: ["20:00"],
    instructions: "Low-dose aspirin for cardiovascular protection. Take at night.",
    simplifiedInstructions: "Take this small pill at bedtime. It protects your heart.",
    startDate: new Date().toISOString(),
    color: "#f59e0b",
    totalPills: 30,
  },
  {
    id: "m4",
    name: "Atorvastatin",
    dosage: "20mg",
    frequency: "Once daily",
    times: ["21:00"],
    instructions: "Take at bedtime for best efficacy. Avoid grapefruit juice.",
    simplifiedInstructions: "Take this pill before sleep. It reduces cholesterol. Avoid grapefruit.",
    startDate: new Date().toISOString(),
    color: "#8b5cf6",
    totalPills: 30,
  },
];

function generateTodayDoses(medicines: Medicine[]): DoseLog[] {
  const today = new Date().toISOString().split("T")[0];
  const doses: DoseLog[] = [];
  for (const med of medicines) {
    for (const time of med.times) {
      const [hour] = time.split(":").map(Number);
      const now = new Date();
      const status: DoseLog["status"] =
        hour < now.getHours() - 1 ? (Math.random() > 0.4 ? "taken" : "missed") : "pending";
      doses.push({
        id: `${med.id}_${time}_${today}`,
        medicineId: med.id,
        medicineName: med.name,
        scheduledTime: time,
        status,
        takenAt: status === "taken" ? new Date().toISOString() : undefined,
        date: today,
      });
    }
  }
  return doses;
}

function generateDoseHistory(medicines: Medicine[]): DoseHistoryDay[] {
  const history: DoseHistoryDay[] = [];
  for (let i = 29; i >= 1; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const total = medicines.reduce((s, m) => s + m.times.length, 0);
    const taken = Math.round(total * (0.6 + Math.random() * 0.4));
    history.push({
      date: d.toISOString().split("T")[0],
      taken: Math.min(taken, total),
      total,
    });
  }
  return history;
}

const DEMO_FOLLOW_UPS: FollowUp[] = [
  {
    id: "f1",
    title: "Cardiology Follow-up",
    doctorName: "Dr. Sarah Mitchell",
    dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    location: "City Heart Hospital, Room 204",
    notes: "Bring latest BP readings and medication list",
    completed: false,
  },
  {
    id: "f2",
    title: "Blood Test",
    doctorName: "Lab at General Hospital",
    dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Pathology Lab, Ground Floor",
    notes: "Fasting required - no food 8 hours before",
    completed: false,
  },
];

const DEMO_PATIENT: Patient = {
  id: "p1",
  name: "John Doe",
  age: 58,
  condition: "Post-cardiac surgery recovery",
  dischargeDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  medicines: DEMO_MEDICINES,
  doseLogs: [],
  symptomLogs: [],
  followUps: DEMO_FOLLOW_UPS,
  emergencyContact: "+1 (555) 911-0000",
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AppUser | null>(null);
  const [role, setRoleState] = useState<UserRole>(null);
  const [medicines, setMedicines] = useState<Medicine[]>(DEMO_MEDICINES);
  const [todayDoses, setTodayDoses] = useState<DoseLog[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>(DEMO_FOLLOW_UPS);
  const [isOnboarded, setIsOnboardedState] = useState(false);
  const [language, setLanguageState] = useState<Language>("en");
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const [isProcessingPrescription, setIsProcessingPrescription] = useState(false);
  const [streak, setStreak] = useState(7);
  const [xp, setXP] = useState(340);
  const [achievements, setAchievements] = useState<Achievement[]>([
    { ...ALL_ACHIEVEMENTS[0], unlockedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
    { ...ALL_ACHIEVEMENTS[1], unlockedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    { ...ALL_ACHIEVEMENTS[4], unlockedAt: new Date(Date.now() - 1 * 86400000).toISOString() },
  ]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [doseHistory, setDoseHistory] = useState<DoseHistoryDay[]>([]);
  const [lastXPGain, setLastXPGain] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (medicines.length > 0) {
      setTodayDoses(generateTodayDoses(medicines));
      setDoseHistory(generateDoseHistory(medicines));
    }
  }, [medicines]);

  async function loadData() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.role) setRoleState(data.role);
        if (data.user) setUserState(data.user);
        if (data.isOnboarded !== undefined) setIsOnboardedState(data.isOnboarded);
        if (data.hapticsEnabled !== undefined) setHapticsEnabledState(data.hapticsEnabled);
        if (data.language) setLanguageState(data.language);
        if (data.medicines) setMedicines(data.medicines);
        if (data.symptomLogs) setSymptomLogs(data.symptomLogs);
        if (data.followUps) setFollowUps(data.followUps);
        if (data.streak) setStreak(data.streak);
        if (data.xp) setXP(data.xp);
        if (data.achievements) setAchievements(data.achievements);
        if (data.journalEntries) setJournalEntries(data.journalEntries);
      }
    } catch {}
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

  const updateDoseStatus = (doseId: string, status: DoseLog["status"]) => {
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

  const addSymptomLog = (log: SymptomLog) => {
    const updated = [log, ...symptomLogs];
    setSymptomLogs(updated);
    saveData({ symptomLogs: updated });
    awardXP(15);
    unlockAchievement("symptom_logger");
  };

  const addFollowUp = (followUp: FollowUp) => {
    const updated = [followUp, ...followUps];
    setFollowUps(updated);
    saveData({ followUps: updated });
  };

  const completeFollowUp = (id: string) => {
    const updated = followUps.map((f) => (f.id === id ? { ...f, completed: true } : f));
    setFollowUps(updated);
    saveData({ followUps: updated });
    awardXP(25);
    unlockAchievement("follow_up");
  };

  const addJournalEntry = (entry: JournalEntry) => {
    const updated = [entry, ...journalEntries];
    setJournalEntries(updated);
    saveData({ journalEntries: updated });
    awardXP(20);
    unlockAchievement("journal_keeper");
  };

  const triggerEmergency = () => console.log("EMERGENCY TRIGGERED");

  const addPrescription = async (_imageUri: string) => {
    setIsProcessingPrescription(true);
    await new Promise((r) => setTimeout(r, 2500));
    setIsProcessingPrescription(false);
    unlockAchievement("scan_master");
  };

  const checkInteractions = (meds: Medicine[]): DrugInteraction[] => {
    const ids = meds.map((m) => m.id);
    return DRUG_INTERACTIONS.filter((i) => i.medIds.every((id) => ids.includes(id)));
  };

  return (
    <AppContext.Provider
      value={{
        user, role, patient: DEMO_PATIENT, medicines, todayDoses, symptomLogs, followUps,
        isOnboarded, language, linkedPatients: [DEMO_PATIENT], isProcessingPrescription,
        hapticsEnabled,
        streak, xp, achievements, doseHistory, lastXPGain, journalEntries,
        drugInteractions: checkInteractions(medicines),
        setRole, setUser, addMedicine, updateDoseStatus, addSymptomLog, addFollowUp,
        completeFollowUp, setOnboarded, setHapticsEnabled, triggerEmergency, setLanguage, addPrescription,
        addJournalEntry, awardXP, unlockAchievement,
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
