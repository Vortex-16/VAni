import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { FamilyController } from "../controllers/familyController";

const router = Router();

router.use(requireAuth);

router.get("/members", FamilyController.getMembers);
router.post("/members", FamilyController.addMember);
router.post("/members/link", FamilyController.linkMember);

export default router;
