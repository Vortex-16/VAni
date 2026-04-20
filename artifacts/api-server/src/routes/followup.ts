import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { FollowupController } from "../controllers/followupController";

const router = Router();
router.use(requireAuth);

router.post("/", FollowupController.createFollowup);
router.get("/", FollowupController.getFollowups);
router.patch("/:id", FollowupController.updateFollowupStatus);
router.delete("/:id", FollowupController.deleteFollowup);

export default router;
