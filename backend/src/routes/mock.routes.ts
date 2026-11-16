import { Router } from "express";
import * as controller from "../controllers/mock.controller";
import { asyncHandler } from "../utils/async-handler";

/**
 * PUBLIC mock gateway:
 *   GET /api/mock/:projectId         → endpoint discovery
 *   ANY /api/mock/:projectId/*       → simulated response
 */
const router = Router();

router.get("/:projectId", asyncHandler(controller.discovery));
router.all("/:projectId/*", asyncHandler(controller.gateway));

export default router;
