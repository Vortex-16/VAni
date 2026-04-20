import { customFetch } from "@workspace/api-client-react";
import type { IDataProvider } from "./types";
import type { Medicine, DoseLog, SymptomLog, FollowUp, JournalEntry } from "./AppContext";

export class ApiProvider implements IDataProvider {
  async getMedicines(): Promise<Medicine[]> {
    const res = await customFetch<{ medicines: Medicine[] }>("/api/medicines");
    return res.medicines;
  }

  async getTodayDoses(): Promise<DoseLog[]> {
    const res = await customFetch<{ doseLogs: DoseLog[] }>("/api/medicines/doses/today");
    return res.doseLogs;
  }

  async updateDoseStatus(doseId: string, status: DoseLog["status"], snoozeMinutes?: number): Promise<void> {
    await customFetch(`/api/medicines/doses/${doseId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, snoozeMinutes })
    });
  }

  async getSymptomLogs(): Promise<SymptomLog[]> {
    const res = await customFetch<{ symptomLogs: SymptomLog[] }>("/api/activity/symptoms");
    return res.symptomLogs;
  }

  async addSymptomLog(log: SymptomLog): Promise<void> {
    await customFetch("/api/activity/symptoms", {
      method: "POST",
      body: JSON.stringify(log)
    });
  }

  async getJournalEntries(): Promise<JournalEntry[]> {
    const res = await customFetch<{ journalEntries: JournalEntry[] }>("/api/activity/journal");
    return res.journalEntries;
  }

  async addJournalEntry(entry: JournalEntry): Promise<void> {
    await customFetch("/api/activity/journal", {
      method: "POST",
      body: JSON.stringify(entry)
    });
  }

  // Not implemented on backend yet, fallback to empty array
  async getFollowUps(): Promise<FollowUp[]> {
    const res = await customFetch<{ followups: FollowUp[] }>("/api/followups/");
    return res.followups;
  }
  
  async addFollowUp(followUp: FollowUp): Promise<void> {
    await customFetch("/api/followups/", {
      method: "POST",
      body: JSON.stringify({
        title: followUp.title,
        doctorName: followUp.doctorName,
        scheduledDate: followUp.dateTime, // Map dateTime to backend's scheduledDate
        location: followUp.location,
        notes: followUp.notes,
        type: "appointment"
      })
    });
  }

  async completeFollowUp(id: string): Promise<void> {
    await customFetch(`/api/followups/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" })
    });
  }

  async simplifyInstruction(text: string): Promise<string> {
    const res = await customFetch<{ simplified: string }>("/api/language/simplify", {
      method: "POST",
      body: JSON.stringify({ text })
    });
    return res.simplified;
  }

  async getRecoveryTrends(): Promise<any> {
    const res = await customFetch("/api/recovery/trends");
    return res;
  }

  async triggerEmergency(): Promise<void> {
    await customFetch("/api/emergency", {
      method: "POST"
    });
  }

  async registerPushToken(token: string): Promise<void> {
    await customFetch("/api/auth/push-token", {
      method: "POST",
      body: JSON.stringify({ token })
    });
  }

  async getLinkedPatients(): Promise<Patient[]> {
    // Backend dev will implement this endpoint
    const res = await customFetch<{ patients: Patient[] }>("/api/caregiver/patients").catch(() => ({ patients: [] }));
    return res.patients || [];
  }

  async addMedicine(medicine: Medicine): Promise<void> {
    await customFetch("/api/medicines", {
      method: "POST",
      body: JSON.stringify(medicine)
    });
  }
}
