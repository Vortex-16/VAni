import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query(`ALTER TYPE link_status ADD VALUE 'pending'`);
    console.log('Added pending');
  } catch(e) { console.log(e.message); }
  
  try {
    await pool.query(`ALTER TYPE link_status ADD VALUE 'rejected'`);
    console.log('Added rejected');
  } catch(e) { console.log(e.message); }

  try {
    await pool.query(`ALTER TYPE schedule_type ADD VALUE 'ONCE'`);
  } catch(e) {}
  
  process.exit(0);
}
run();
