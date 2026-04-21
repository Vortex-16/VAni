import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { DoseTrackingController } from "../controllers/doseTrackingController";

const router = Router();
router.use(requireAuth);

router.get("/stats", DoseTrackingController.getAdherenceStats);
router.post("/mark-missed", DoseTrackingController.markMissedDoses);

export default router;
