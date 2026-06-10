import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const sql = fs.readFileSync('../../lib/db/drizzle/0000_spicy_micromacro.sql', 'utf8');
    // Split statements on statement-breakpoint
    const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
    
    for (const stmt of statements) {
      try {
        await pool.query(stmt);
        console.log('Executed:', stmt.substring(0, 50) + '...');
      } catch (err) {
        // Ignore if already exists
        if (err.code === '42710' || err.code === '42P07') {
          console.log('Skipped (already exists):', stmt.substring(0, 50) + '...');
        } else {
          console.error('Error executing:', stmt.substring(0, 50) + '...', err.message);
        }
      }
    }
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
