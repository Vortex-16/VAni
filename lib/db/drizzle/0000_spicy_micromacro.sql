CREATE TYPE "public"."blood_request_status" AS ENUM('open', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."blood_type" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');--> statement-breakpoint
CREATE TYPE "public"."blood_urgency" AS ENUM('low', 'normal', 'critical');--> statement-breakpoint
CREATE TYPE "public"."dose_status" AS ENUM('taken', 'missed', 'pending', 'snoozed');--> statement-breakpoint
CREATE TYPE "public"."link_relationship" AS ENUM('family', 'caregiver');--> statement-breakpoint
CREATE TYPE "public"."link_status" AS ENUM('active', 'revoked', 'pending', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."reminder_status" AS ENUM('pending', 'delivered', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."schedule_type" AS ENUM('ONCE', 'RECURRING', 'MEDICATION_LINKED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('patient', 'caregiver', 'family', 'doctor');--> statement-breakpoint
CREATE TABLE "blood_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid,
	"patient_name" text NOT NULL,
	"blood_type" "blood_type" NOT NULL,
	"units_needed" integer DEFAULT 1 NOT NULL,
	"hospital" text NOT NULL,
	"area" text,
	"city" text,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"urgency" "blood_urgency" DEFAULT 'normal' NOT NULL,
	"contact_phone" text NOT NULL,
	"note" text,
	"status" "blood_request_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "care_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"relationship" "link_relationship" NOT NULL,
	"status" "link_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "care_links_patient_manager_unique" UNIQUE("patient_id","manager_id")
);
--> statement-breakpoint
CREATE TABLE "discharge_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"hospital_name" text,
	"data" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "donor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"blood_type" "blood_type" NOT NULL,
	"phone" text NOT NULL,
	"area" text,
	"city" text,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"is_available" boolean DEFAULT true NOT NULL,
	"last_donation" date,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "donor_profiles_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "dose_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medicine_id" uuid NOT NULL,
	"scheduled_time" text NOT NULL,
	"taken_at" timestamp,
	"status" "dose_status" DEFAULT 'pending' NOT NULL,
	"date" text NOT NULL,
	"snoozed_until" timestamp,
	"last_notified_at" timestamp,
	"escalated_to_caregiver" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "emergency_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"title" text NOT NULL,
	"doctor_name" text NOT NULL,
	"date_time" timestamp NOT NULL,
	"location" text NOT NULL,
	"notes" text,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "followups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"reminder_days_before" integer DEFAULT 1,
	"notes" text,
	"status" varchar(20) DEFAULT 'upcoming',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"mood" integer NOT NULL,
	"energy" integer NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_terms_dictionary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"abbreviation" varchar(50) NOT NULL,
	"simple_meaning" varchar(255) NOT NULL,
	"full_term" varchar(255),
	"category" varchar(50),
	CONSTRAINT "medical_terms_dictionary_abbreviation_unique" UNIQUE("abbreviation")
);
--> statement-breakpoint
CREATE TABLE "medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"name" text NOT NULL,
	"dosage" text NOT NULL,
	"frequency" text NOT NULL,
	"times" text[] NOT NULL,
	"instructions" text,
	"simplified_instructions" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"color" text DEFAULT '#0891b2',
	"total_pills" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"plan_id" uuid
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid NOT NULL,
	"receiver_id" uuid NOT NULL,
	"patient_context_id" uuid NOT NULL,
	"text" text NOT NULL,
	"audio_base64" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" uuid,
	"name" text NOT NULL,
	"age" integer NOT NULL,
	"condition" text NOT NULL,
	"discharge_date" timestamp NOT NULL,
	"emergency_contact" text NOT NULL,
	"link_code" varchar(12),
	"link_code_issued_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "patients_link_code_unique" UNIQUE("link_code")
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"image_url" text,
	"raw_text" text,
	"extracted_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recovery_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"log_date" date NOT NULL,
	"pain_level" integer,
	"energy_level" integer,
	"fever" boolean DEFAULT false,
	"fever_temp" numeric(4, 1),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "recovery_logs_user_id_log_date_unique" UNIQUE("user_id","log_date")
);
--> statement-breakpoint
CREATE TABLE "scheduled_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"message" text NOT NULL,
	"voice_enabled" boolean DEFAULT false,
	"schedule_type" "schedule_type" NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"recurrence" text,
	"status" "reminder_status" DEFAULT 'pending' NOT NULL,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "symptom_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"symptoms" text[] NOT NULL,
	"severity" integer NOT NULL,
	"notes" text,
	"risk_level" "risk_level" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" "user_role",
	"linked_patient_id" uuid,
	"blood_type" text,
	"allergies" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"phone" text,
	"avatar" text,
	"password" text,
	"push_token" text,
	"hospital" text,
	"designation" text,
	"department" text,
	"registration_number" text,
	"specialization" text,
	"relationship_preference" text,
	"anchor_times" jsonb DEFAULT '{"morning":"08:00","afternoon":"14:00","evening":"20:00","night":"22:00"}'::jsonb,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"email_verification_code" text,
	"email_verification_expires" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "voice_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"audio_base64" text NOT NULL,
	"transcript" text NOT NULL,
	"schedule_type" "schedule_type" NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"recurrence" text,
	"status" "reminder_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "blood_requests" ADD CONSTRAINT "blood_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_links" ADD CONSTRAINT "care_links_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_links" ADD CONSTRAINT "care_links_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discharge_plans" ADD CONSTRAINT "discharge_plans_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_profiles" ADD CONSTRAINT "donor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dose_logs" ADD CONSTRAINT "dose_logs_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_alerts" ADD CONSTRAINT "emergency_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followups" ADD CONSTRAINT "followups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_patient_context_id_patients_id_fk" FOREIGN KEY ("patient_context_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_caregiver_id_users_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_logs" ADD CONSTRAINT "recovery_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symptom_logs" ADD CONSTRAINT "symptom_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_reminders" ADD CONSTRAINT "voice_reminders_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_reminders" ADD CONSTRAINT "voice_reminders_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;