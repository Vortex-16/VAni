import { pgTable, text, integer, timestamp, boolean, pgEnum, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["patient", "caregiver"]);
export const riskLevelEnum = pgEnum("risk_level", ["low", "medium", "high"]);
export const doseStatusEnum = pgEnum("dose_status", ["taken", "missed", "pending", "snoozed"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role"),
  linkedPatientId: uuid("linked_patient_id"),
  bloodType: text("blood_type"),
  allergies: text("allergies"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  pushToken: text("push_token"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  condition: text("condition").notNull(),
  dischargeDate: timestamp("discharge_date").notNull(),
  emergencyContact: text("emergency_contact").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const medicines = pgTable("medicines", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  times: text("times").array().notNull(), // Array of strings like ["08:00", "20:00"]
  instructions: text("instructions"),
  simplifiedInstructions: text("simplified_instructions"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  color: text("color").default("#0891b2"),
  totalPills: integer("total_pills"),
});

export const doseLogs = pgTable("dose_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  medicineId: uuid("medicine_id").references(() => medicines.id).notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  takenAt: timestamp("taken_at"),
  status: doseStatusEnum("status").default("pending").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  snoozedUntil: timestamp("snoozed_until"),
});

export const symptomLogs = pgTable("symptom_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  symptoms: text("symptoms").array().notNull(),
  severity: integer("severity").notNull(),
  notes: text("notes"),
  riskLevel: riskLevelEnum("risk_level").notNull(),
});

export const followUps = pgTable("follow_ups", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  title: text("title").notNull(),
  doctorName: text("doctor_name").notNull(),
  dateTime: timestamp("date_time").notNull(),
  location: text("location").notNull(),
  notes: text("notes"),
  completed: boolean("completed").default(false).notNull(),
});

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  mood: integer("mood").notNull(),
  energy: integer("energy").notNull(),
  text: text("text").notNull(),
});

export const emergencyAlerts = pgTable("emergency_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  status: text("status").default("active").notNull(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertPatientSchema = createInsertSchema(patients);
export const insertMedicineSchema = createInsertSchema(medicines);
export const insertDoseLogSchema = createInsertSchema(doseLogs);
export const insertSymptomLogSchema = createInsertSchema(symptomLogs);
export const insertFollowUpSchema = createInsertSchema(followUps);
export const insertJournalEntrySchema = createInsertSchema(journalEntries);
export const insertEmergencyAlertSchema = createInsertSchema(emergencyAlerts);