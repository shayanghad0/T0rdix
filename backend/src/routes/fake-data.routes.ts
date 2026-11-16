import { Router } from "express";
import * as controller from "../controllers/fake-data.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

const router = Router();
router.use(requireAuth);

router.post("/", asyncHandler(controller.generate));

export default router;
