import { Router } from "express";
import * as controller from "../controllers/collection.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

const router = Router();
router.use(requireAuth);

// Collections
router.get("/projects/:projectId/collections", asyncHandler(controller.list));
router.post("/projects/:projectId/collections", asyncHandler(controller.create));
router.patch("/collections/:id", asyncHandler(controller.update));
router.delete("/collections/:id", asyncHandler(controller.remove));

// Saved requests
router.post("/collections/:id/requests", asyncHandler(controller.addRequest));
router.patch("/requests/:id", asyncHandler(controller.updateRequest));
router.delete("/requests/:id", asyncHandler(controller.removeRequest));

// One-shot runner (server-side proxy, used by API Testing)
router.post("/run", asyncHandler(controller.run));

export default router;
