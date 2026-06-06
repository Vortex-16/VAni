/**
 * One-off backfill for the patient-linking feature.
 *  1. Generates a unique link_code for every patient that lacks one.
 *  2. Seeds care_links from the legacy patients.caregiver_id pointer.
 *
 * Run AFTER `drizzle-kit push` has added the columns/table:
 *   node artifacts/api-server/backfill-links.mjs
 *
 * Idempotent — safe to run more than once.
 */
import "dotenv/config";
import pg from "pg";
import crypto from "crypto";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const genCode = () => {
  let b = "";
  for (let i = 0; i < 6; i++) b += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return `DB-${b}`;
};

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function backfillCodes() {
  const { rows } = await pool.query("SELECT id FROM patients WHERE link_code IS NULL");
  let done = 0;
  for (const { id } of rows) {
    // Retry on the (very unlikely) unique collision.
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        await pool.query(
          "UPDATE patients SET link_code = $1, link_code_issued_at = now() WHERE id = $2",
          [genCode(), id]
        );
        done++;
        break;
      } catch (e) {
        if (e.code !== "23505") throw e; // not a unique violation → rethrow
      }
    }
  }
  console.log(`link_code backfilled for ${done}/${rows.length} patient(s).`);
}

async function seedCareLinks() {
  const result = await pool.query(`
    INSERT INTO care_links (patient_id, manager_id, relationship, status)
    SELECT p.id, p.caregiver_id,
           (CASE WHEN u.role = 'caregiver' THEN 'caregiver' ELSE 'family' END)::link_relationship,
           'active'::link_status
    FROM patients p
    JOIN users u ON u.id = p.caregiver_id
    WHERE p.caregiver_id IS NOT NULL
    ON CONFLICT (patient_id, manager_id) DO NOTHING
  `);
  console.log(`care_links seeded: ${result.rowCount} row(s) inserted.`);
}

(async () => {
  try {
    await backfillCodes();
    await seedCareLinks();
    console.log("Backfill complete.");
  } catch (e) {
    console.error("Backfill failed:", e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
