import { Router } from "express";
import * as controller from "../controllers/api.controller";
import * as mockController from "../controllers/mock.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

/**
 * API Mock Studio management routes (authentication required).
 * The public mock *gateway* lives in `mock.routes.ts`.
 */
const router = Router();
router.use(requireAuth);

router.get("/projects/:projectId/apis", asyncHandler(controller.list));
router.post("/projects/:projectId/apis", asyncHandler(controller.create));

router.patch("/apis/:id", asyncHandler(controller.update));
router.delete("/apis/:id", asyncHandler(controller.remove));

router.post("/apis/:id/endpoints", asyncHandler(controller.addEndpoint));
router.patch("/endpoints/:id", asyncHandler(controller.updateEndpoint));
router.delete("/endpoints/:id", asyncHandler(controller.removeEndpoint));

export default router;
