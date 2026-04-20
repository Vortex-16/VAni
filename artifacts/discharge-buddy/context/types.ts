import type { Medicine, DoseLog, SymptomLog, FollowUp, JournalEntry, Patient } from "./AppContext";

export interface IDataProvider {
  getMedicines(): Promise<Medicine[]>;
  getTodayDoses(): Promise<DoseLog[]>;
  updateDoseStatus(doseId: string, status: DoseLog["status"], snoozeMinutes?: number): Promise<void>;
  
  getSymptomLogs(): Promise<SymptomLog[]>;
  addSymptomLog(log: SymptomLog): Promise<void>;
  
  getJournalEntries(): Promise<JournalEntry[]>;
  addJournalEntry(entry: JournalEntry): Promise<void>;
  
  getFollowUps(): Promise<FollowUp[]>;
  addFollowUp(followUp: FollowUp): Promise<void>;
  completeFollowUp(id: string): Promise<void>;

  simplifyInstruction(text: string): Promise<string>;
  getRecoveryTrends(): Promise<any>;

  triggerEmergency(): Promise<void>;
  getLinkedPatients(): Promise<Patient[]>;
  addMedicine(medicine: Medicine): Promise<void>;
}
