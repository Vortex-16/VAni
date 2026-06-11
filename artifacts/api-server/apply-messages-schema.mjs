/**
 * Idempotent, additive schema application for the real-time chat `messages`
 * table. Used instead of `drizzle-kit push` because push's interactive resolver
 * requires a TTY (it cannot run in non-interactive shells / CI).
 *
 *   node artifacts/api-server/apply-messages-schema.mjs
 */
import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const statements = [
  `CREATE TABLE IF NOT EXISTS messages (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     sender_id uuid NOT NULL REFERENCES users(id),
     receiver_id uuid NOT NULL REFERENCES users(id),
     patient_context_id uuid NOT NULL REFERENCES patients(id),
     text text NOT NULL,
     audio_base64 text,
     created_at timestamp DEFAULT now()
   );`,
  // Helps the bidirectional history query and per-conversation lookups.
  `CREATE INDEX IF NOT EXISTS messages_pair_idx
     ON messages (patient_context_id, created_at);`,
  `CREATE INDEX IF NOT EXISTS messages_participants_idx
     ON messages (sender_id, receiver_id);`,
];

const run = async () => {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }
  const client = await pool.connect();
  try {
    for (const sql of statements) {
      await client.query(sql);
    }
    const { rows } = await client.query("SELECT to_regclass('public.messages') AS t");
    console.log("✓ messages table ready:", rows[0].t);
  } catch (err) {
    console.error("Schema apply failed:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();
