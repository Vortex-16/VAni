import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { RecoveryController } from "../controllers/recoveryController";

const router = Router();
router.use(requireAuth);

router.post("/log", RecoveryController.upsertRecoveryLog);
router.get("/logs", RecoveryController.getRecoveryLogs);
router.get("/trends", RecoveryController.getRecoveryTrends);
router.get("/alerts", RecoveryController.getAlerts);

export default router;
