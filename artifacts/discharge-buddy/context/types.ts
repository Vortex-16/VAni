import type { Medicine, DoseLog, SymptomLog, FollowUp, JournalEntry } from "./AppContext";

export interface IDataProvider {
  getMedicines(): Promise<Medicine[]>;
  getTodayDoses(): Promise<DoseLog[]>;
  updateDoseStatus(doseId: string, status: DoseLog["status"], snoozeMinutes?: number): Promise<void>;
  
  getSymptomLogs(): Promise<SymptomLog[]>;
  addSymptomLog(log: SymptomLog): Promise<void>;
  
  getJournalEntries(): Promise<JournalEntry[]>;
  addJournalEntry(entry: JournalEntry): Promise<void>;
  
  getFollowUps(): Promise<FollowUp[]>;
  completeFollowUp(id: string): Promise<void>;

  triggerEmergency(): Promise<void>;
  getLinkedPatients(): Promise<Patient[]>;
}
