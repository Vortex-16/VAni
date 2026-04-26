import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import medicinesRouter from "./medicines";
import activityRouter from "./activity";
import emergencyRouter from "./emergency";
import ocrRouter from "./ocr";
import caregiverRouter from "./caregiver";
import doseTrackingRouter from "./doseTracking";
import followupRouter from "./followup";
import languageSimplifierRouter from "./languageSimplifier";
import recoveryRouter from "./recovery";
import storageRouter from "./storage";
import supportRouter from "./support";
import dischargeRouter from "./discharge";
import aiRouter from "./ai";

const router: IRouter = Router();

// Existing routes (untouched)
router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/medicines", medicinesRouter);
router.use("/activity", activityRouter);
router.use("/emergency", emergencyRouter);
router.use("/ocr", ocrRouter);
router.use("/caregiver", caregiverRouter);

// New integrated backend feature routes
router.use("/dose-tracking", doseTrackingRouter);
router.use("/followups", followupRouter);
router.use("/language", languageSimplifierRouter);
router.use("/recovery", recoveryRouter);
router.use("/storage", storageRouter);
router.use("/support", supportRouter);
router.use("/discharge", dischargeRouter);
router.use("/ai", aiRouter);

export default router;
