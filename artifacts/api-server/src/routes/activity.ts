import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { ActivityController } from "../controllers/activityController";

const router = Router();
router.use(requireAuth);

router.get("/symptoms", ActivityController.getSymptoms);
router.post("/symptoms", ActivityController.addSymptom);

router.get("/journal", ActivityController.getJournal);
router.post("/journal", ActivityController.addJournal);

export default router;
