import { pool } from "@workspace/db";
import { logger } from "./lib/logger";

/**
 * Idempotent, additive schema guards run at server startup so a freshly-deployed
 * backend (e.g. Cloud Run) works even if migrations weren't applied by hand.
 * Mirrors `apply-messages-schema.mjs`. Safe to run on every boot.
 */
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS messages (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     sender_id uuid NOT NULL REFERENCES users(id),
     receiver_id uuid NOT NULL REFERENCES users(id),
     patient_context_id uuid NOT NULL REFERENCES patients(id),
     text text NOT NULL,
     audio_base64 text,
     created_at timestamp DEFAULT now()
   );`,
  `CREATE INDEX IF NOT EXISTS messages_pair_idx ON messages (patient_context_id, created_at);`,
  `CREATE INDEX IF NOT EXISTS messages_participants_idx ON messages (sender_id, receiver_id);`,
];

export async function ensureSchema(): Promise<void> {
  try {
    for (const sql of STATEMENTS) {
      await pool.query(sql);
    }
    logger.info("Schema guard: chat 'messages' table ensured");
  } catch (err) {
    // Don't crash the server — log loudly so the chat failure is diagnosable.
    logger.error({ err }, "Schema guard failed (chat messaging may not work until the 'messages' table exists)");
  }
}
