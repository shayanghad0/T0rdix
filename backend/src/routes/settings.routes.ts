import { Router } from "express";
import * as controller from "../controllers/settings.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(controller.show));
router.patch("/", requireRole("ADMIN"), asyncHandler(controller.update));

export default router;
