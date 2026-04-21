import fs from 'fs';
import path from 'path';
import { PrescriptionService } from './prescriptionService';

async function testScan() {
  const b64Path = path.resolve(process.cwd(), 'test_bhavana_b64.txt');
  const b64 = fs.readFileSync(b64Path, 'utf8').trim();
  
  console.log("🚀 Starting E2E Scan Test (Bhavana Prescription)...");

  try {
    // Accessing the private method for debugging if needed, but let's just use the public one first.
    // We'll add some logging in the service if needed.
    const result = await PrescriptionService.analyzePrescription(b64);
    console.log("✅ SCAN SUCCESS!");
    console.log(JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("❌ Request Failed:", err.message);
  }
}

testScan();
