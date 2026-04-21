import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { LanguageSimplifierController } from "../controllers/languageSimplifierController";

const router = Router();
router.use(requireAuth);

router.post("/simplify", LanguageSimplifierController.simplifyText);
router.get("/lookup", LanguageSimplifierController.lookupTerm);

export default router;
