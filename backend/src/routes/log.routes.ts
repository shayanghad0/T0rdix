import { Router } from "express";
import * as controller from "../controllers/log.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(controller.list));

export default router;
