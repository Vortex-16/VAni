import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { DischargeController } from "../controllers/dischargeController";

const router = Router();

router.use(requireAuth);

router.post("/import", DischargeController.importPlan);
router.post("/create", DischargeController.createPlan);
router.get("/:id", DischargeController.getPlan);
router.post("/:id", DischargeController.getPlan);

export default router;
