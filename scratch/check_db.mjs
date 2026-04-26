import { db, dischargePlans } from "../lib/db/src/index";

async function checkDB() {
  try {
    const allPlans = await db.select().from(dischargePlans);
    console.log(`Total plans: ${allPlans.length}`);
    if (allPlans.length > 0) {
      console.log("First plan ID:", allPlans[0].id);
      console.log("First plan data:", JSON.stringify(allPlans[0].data, null, 2));
    }
  } catch (err) {
    console.error("DB check failed:", err.message);
  }
}

checkDB();
