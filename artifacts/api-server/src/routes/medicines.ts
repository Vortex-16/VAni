import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { MedicineController } from "../controllers/medicineController";

const router = Router();
router.use(requireAuth);

router.get("/", MedicineController.getMedicines);
router.get("/doses/today", MedicineController.getTodayDoses);
router.put("/doses/:id/status", MedicineController.updateDoseStatus);

export default router;
