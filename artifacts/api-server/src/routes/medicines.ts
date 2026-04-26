import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { MedicineController } from "../controllers/medicineController";

const router = Router();

// Enable auth for all medicine routes
router.use(requireAuth);

// Debugging middleware to trace every request to this router
router.use((req, res, next) => {
  console.log(`[MedicineRouter] Request: ${req.method} ${req.originalUrl}`);
  next();
});

// GET /api/medicines
router.get("/", MedicineController.getMedicines);

// POST /api/medicines
router.post("/", MedicineController.addMedicine);

// GET /api/medicines/today
router.get("/doses/today", MedicineController.getTodayDoses);

// PUT /api/medicines/doses/:id/status
router.put("/doses/:id/status", MedicineController.updateDoseStatus);

// PUT /api/medicines/:id
router.put("/:id", MedicineController.updateMedicine);

// GET /api/medicines/adherence/history
router.get("/adherence/history", MedicineController.getAdherenceHistory);

// DELETE /api/medicines/:id
router.delete("/:id", MedicineController.deleteMedicine);

export default router;
