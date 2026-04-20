import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import medicinesRouter from "./medicines";
import activityRouter from "./activity";
import emergencyRouter from "./emergency";
import doseTrackingRouter from "./doseTracking";
import followupRouter from "./followup";
import languageSimplifierRouter from "./languageSimplifier";
import recoveryRouter from "./recovery";
import storageRouter from "./storage";

const router: IRouter = Router();

// Existing routes (untouched)
router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/medicines", medicinesRouter);
router.use("/activity", activityRouter);
router.use("/emergency", emergencyRouter);

// New integrated backend feature routes
router.use("/dose-tracking", doseTrackingRouter);
router.use("/followups", followupRouter);
router.use("/language", languageSimplifierRouter);
router.use("/recovery", recoveryRouter);
router.use("/storage", storageRouter);

export default router;
