import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import medicinesRouter from "./medicines";
import activityRouter from "./activity";
import emergencyRouter from "./emergency";
import ocrRouter from "./ocr";
import caregiverRouter from "./caregiver";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/medicines", medicinesRouter);
router.use("/activity", activityRouter);
router.use("/emergency", emergencyRouter);
router.use("/ocr", ocrRouter);
router.use("/caregiver", caregiverRouter);

export default router;
