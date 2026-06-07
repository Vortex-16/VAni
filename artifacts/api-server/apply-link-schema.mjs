/**
 * Idempotent, additive schema application for the patient-linking feature.
 * Safer than `drizzle-kit push` here because push prompts to "truncate" when
 * adding the unique constraint (unnecessary — existing link_code values are NULL).
 *
 *   node artifacts/api-server/apply-link-schema.mjs
 */
import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const statements = [
  // Email-verification columns (added with the OTP feature; older DBs lack them).
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified boolean NOT NULL DEFAULT false;`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_code text;`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires timestamp;`,
  // Enums (CREATE TYPE has no IF NOT EXISTS — guard via catalog check).
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'link_relationship') THEN
       CREATE TYPE link_relationship AS ENUM ('family', 'caregiver');
     END IF;
   END $$;`,
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'link_status') THEN
       CREATE TYPE link_status AS ENUM ('active', 'revoked');
     END IF;
   END $$;`,
  // Patient columns.
  `ALTER TABLE patients ADD COLUMN IF NOT EXISTS link_code varchar(12);`,
  `ALTER TABLE patients ADD COLUMN IF NOT EXISTS link_code_issued_at timestamp;`,
  // Unique constraint on link_code (NULLs are allowed and don't collide).
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_link_code_unique') THEN
       ALTER TABLE patients ADD CONSTRAINT patients_link_code_unique UNIQUE (link_code);
     END IF;
   END $$;`,
  // care_links join table.
  `CREATE TABLE IF NOT EXISTS care_links (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     patient_id uuid NOT NULL REFERENCES patients(id),
     manager_id uuid NOT NULL REFERENCES users(id),
     relationship link_relationship NOT NULL,
     status link_status NOT NULL DEFAULT 'active',
     created_at timestamp DEFAULT now(),
     CONSTRAINT care_links_patient_manager_unique UNIQUE (patient_id, manager_id)
   );`,
];

(async () => {
  const client = await pool.connect();
  try {
    for (const sql of statements) {
      await client.query(sql);
      console.log("✓", sql.split("\n")[0].trim().slice(0, 70));
    }
    console.log("Schema applied successfully.");
  } catch (e) {
    console.error("Schema apply failed:", e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
