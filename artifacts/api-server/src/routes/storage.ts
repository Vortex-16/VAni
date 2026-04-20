import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { StorageController } from "../controllers/storageController";

const router = Router();
router.use(requireAuth);

router.post("/prescriptions", StorageController.savePrescription);
router.get("/prescriptions", StorageController.getPrescriptionHistory);
router.get("/profile", StorageController.getUserProfile);

export default router;
