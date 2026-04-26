/**
 * backfill-doses.ts
 *
 * One-time script to generate today's dose_logs for all existing medicines.
 * Run with: npx tsx backfill-doses.ts
 *
 * This fixes the empty dose_logs table by retroactively generating
 * today's pending doses for medicines that were added before the
 * generateDosesForToday hook was in place.
 */

import "dotenv/config";
import { db, medicines, doseLogs } from "@workspace/db";
import { eq, and } from "drizzle-orm";

async function backfill() {
  console.log("🔄 Starting dose log backfill for today...");

  const today = new Date().toISOString().split("T")[0];
  console.log(`📅 Target date: ${today}`);

  const allMedicines = await db.select().from(medicines);
  console.log(`💊 Found ${allMedicines.length} medicines to process.`);

  let generated = 0;
  let skipped = 0;

  for (const med of allMedicines) {
    // Skip if end date has passed
    if (med.endDate && new Date(today) > new Date(med.endDate)) {
      console.log(`  ⏭️  Skipping ${med.name} — course ended.`);
      skipped++;
      continue;
    }

    // Check if doses already exist for today
    const existing = await db.select().from(doseLogs).where(
      and(eq(doseLogs.medicineId, med.id), eq(doseLogs.date, today))
    );

    if (existing.length > 0) {
      console.log(`  ✅ ${med.name} — doses already exist (${existing.length} logs). Skipping.`);
      skipped++;
      continue;
    }

    // Generate a pending dose log for each scheduled time
    const newDoses = med.times.map((time: string) => ({
      medicineId: med.id,
      scheduledTime: time,
      status: "pending" as const,
      date: today,
    }));

    await db.insert(doseLogs).values(newDoses);
    console.log(`  ➕ ${med.name} — created ${newDoses.length} dose log(s) for ${med.times.join(", ")}`);
    generated += newDoses.length;
  }

  console.log("\n📊 Backfill complete!");
  console.log(`   ✅ Generated: ${generated} dose logs`);
  console.log(`   ⏭️  Skipped:   ${skipped} medicines`);
  console.log("\n🔔 The notification engine will now pick these up on its next cron tick.");
  process.exit(0);
}

backfill().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});
