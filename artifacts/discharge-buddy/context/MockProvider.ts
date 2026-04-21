import AsyncStorage from "@react-native-async-storage/async-storage";
import type { IDataProvider } from "./types";
import type { Medicine, DoseLog, SymptomLog, FollowUp, JournalEntry, Patient, PrescriptionAnalysisResult } from "./AppContext";
import type { Medicine, DoseLog, SymptomLog, FollowUp, JournalEntry, Patient } from "./AppContext";
import { ALL_ACHIEVEMENTS } from "./AppContext";

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
];

const DEMO_FOLLOW_UPS: FollowUp[] = [
  {
    id: "f1",
    title: "Cardiology Follow-up",
    doctorName: "Dr. Sarah Mitchell",
    dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    location: "City Heart Hospital, Room 204",
    notes: "Bring latest BP readings and medication list",
    completed: false,
  }
];

const DEMO_PATIENTS: Patient[] = [
  {
    id: "p1",
    name: "Mary Smith",
    age: 68,
    condition: "Post-op Knee Replacement",
    dischargeDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    medicines: DEMO_MEDICINES,
    doseLogs: [], // Populated on the fly
    symptomLogs: [
      { id: "s1", date: new Date().toISOString(), symptoms: ["Pain"], severity: 3, notes: "Feeling okay", riskLevel: "low" }
    ],
    followUps: DEMO_FOLLOW_UPS,
    emergencyContact: "John Smith (+1 555-0101)",
  }
];

export class MockProvider implements IDataProvider {
  
  private async getData() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  private async saveData(data: any) {
    const existing = await this.getData();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...data }));
  }

  async getMedicines(): Promise<Medicine[]> {
    const data = await this.getData();
    return data.medicines || DEMO_MEDICINES;
  }

  async getTodayDoses(): Promise<DoseLog[]> {
    // Generate them on the fly similarly to the old AppContext
    const medicines = await this.getMedicines();
    const today = new Date().toISOString().split("T")[0];
    const doses: DoseLog[] = [];
    
    for (const med of medicines) {
      for (const time of med.times) {
        const [hour] = time.split(":").map(Number);
        const now = new Date();
        const status: DoseLog["status"] = hour < now.getHours() - 1 ? (Math.random() > 0.4 ? "taken" : "missed") : "pending";
        
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

  async updateDoseStatus(doseId: string, status: DoseLog["status"], snoozeMinutes?: number): Promise<void> {
    // In mock mode, the AppContext manages the todayDoses array state inline.
    await new Promise(r => setTimeout(r, 200));
  }

  async getSymptomLogs(): Promise<SymptomLog[]> {
    const data = await this.getData();
    return data.symptomLogs || [];
  }

  async addSymptomLog(log: SymptomLog): Promise<void> {
    const logs = await this.getSymptomLogs();
    await this.saveData({ symptomLogs: [log, ...logs] });
  }

  async getJournalEntries(): Promise<JournalEntry[]> {
    const data = await this.getData();
    return data.journalEntries || [];
  }

  async addJournalEntry(entry: JournalEntry): Promise<void> {
    const entries = await this.getJournalEntries();
    await this.saveData({ journalEntries: [entry, ...entries] });
  }

  async getFollowUps(): Promise<FollowUp[]> {
    const data = await this.getData();
    return data.followUps || DEMO_FOLLOW_UPS;
  }

  async addFollowUp(followUp: FollowUp): Promise<void> {
    const followUps = await this.getFollowUps();
    await this.saveData({ followUps: [followUp, ...followUps] });
  }

  async completeFollowUp(id: string): Promise<void> {
    const followUps = await this.getFollowUps();
    const updated = followUps.map(f => f.id === id ? { ...f, completed: true } : f);
    await this.saveData({ followUps: updated });
  }

  async simplifyInstruction(text: string): Promise<string> {
    return text + " (Simplified)";
  }

  async getRecoveryTrends(): Promise<any> {
    return { data: [] };
  }

  async triggerEmergency(): Promise<void> {
    console.log("Mock emergency triggered");
  }

  async registerPushToken(token: string): Promise<void> {
    console.log("Mock push token registered:", token);
  }

  async getLinkedPatients(): Promise<Patient[]> {
    return DEMO_PATIENTS;
  }

  async scanPrescription(_imageBase64: string): Promise<PrescriptionAnalysisResult> {
    await new Promise(r => setTimeout(r, 1500));
    return {
      medicines: [
        {
          name: "Amlodipine",
          dosage: "5mg",
          frequency: "Once daily",
          duration: "30 days",
          timing: "Morning",
          notes: "For blood pressure",
          confidence: 95,
          low_confidence: false,
          simplifiedInstructions: "Take this pill every morning. It controls blood pressure.",
          times: ["08:00"]
        }
      ],
      general_instructions: "Take as directed.",
      explanation: "This is a mock prescription result.",
      warnings: [],
      overall_confidence: 95,
      ocr_source: "mock",
      processing_note: "Mock result for development"
    };
  async addMedicine(medicine: Medicine): Promise<void> {
    const medicines = await this.getMedicines();
    await this.saveData({ medicines: [medicine, ...medicines] });
  }
}
