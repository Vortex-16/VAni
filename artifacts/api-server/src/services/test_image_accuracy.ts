
import "dotenv/config";
import { PrescriptionService } from "./PrescriptionService";
import { enrichWithRuleParsing } from "./medicalParser";

const MOCK_OCR_TEXT = `
Dr. Siri V. MBBS, MS(OBG), FIRM
Mrs Bhavana 7/7/22
- T. Cabergoline 0.25mg twice weekly x 4 weeks (Mon/Thur)
- Dailyshine 60k / Methycal 1500 / Deviry 60k weekly once x 8 weeks.
- T. Thyronorm 50 mcg 1 - 0 - 0 empty stomach
`;

async function testAccuracy() {
    console.log("🧪 Testing AI Parsing for Mrs Bhavana Prescription...");
    
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("❌ No API Key found in .env");
      return;
    }

    try {
        // 1. Structure with AI
        const structured = await (PrescriptionService as any).structureWithGroq(
            MOCK_OCR_TEXT, 
            apiKey
        );

        // 2. Enrich with Medical Rules (This is what handles 'twice weekly' etc)
        const medicines = enrichWithRuleParsing(structured.medicines);

        console.log("\n✅ PARSED MEDICINES:");
        medicines.forEach(med => {
            console.log(`--- ${med.name} ---`);
            console.log(`   Dosage:    ${med.dosage}`);
            console.log(`   Frequency: ${med.frequency} (Code: ${med.frequency_code})`);
            console.log(`   Schedule:  Morning: ${med.schedule.morning}, Evening: ${med.schedule.night}`);
            console.log(`   Notes:     ${med.notes}`);
        });
        
        console.log("\n💡 AI EXPLANATION:");
        console.log(structured.explanation);

    } catch (err: any) {
        console.error("❌ Test failed:", err.message);
    }
}

testAccuracy();
