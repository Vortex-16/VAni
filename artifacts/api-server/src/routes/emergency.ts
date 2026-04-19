import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { EmergencyController } from "../controllers/emergencyController";

const router = Router();
router.use(requireAuth);

router.post("/", EmergencyController.triggerEmergency);
router.get("/", EmergencyController.getEmergencies);

export default router;
