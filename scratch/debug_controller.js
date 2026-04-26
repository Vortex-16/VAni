const { DischargeController } = require("./artifacts/api-server/src/controllers/dischargeController");
const { logger } = require("./artifacts/api-server/src/lib/logger");

async function test() {
  try {
    const mockReq = {
      params: { id: "dev" },
      user: { id: "test-user" },
      body: undefined // This is what we suspect is causing the crash
    };
    const mockRes = {
      status: (code) => ({ json: (data) => console.log(`Status ${code}:`, data) }),
      json: (data) => console.log("JSON:", data)
    };
    
    console.log("Starting test...");
    await DischargeController.getPlan(mockReq, mockRes);
    console.log("Test finished.");
  } catch (err) {
    console.error("CRASHED:", err);
  }
}

test();
