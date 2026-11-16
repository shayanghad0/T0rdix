import { Router } from "express";
import * as controller from "../controllers/secret.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

const router = Router();
router.use(requireAuth);

// Project-scoped
router.get("/projects/:projectId/secrets", asyncHandler(controller.list));
router.post("/projects/:projectId/secrets", asyncHandler(controller.create));
router.post("/projects/:projectId/secrets/bulk", asyncHandler(controller.bulkUpsert));
router.get("/projects/:projectId/secrets/export", asyncHandler(controller.exportDotenv));

// Item-scoped
router.patch("/secrets/:id", asyncHandler(controller.update));
router.delete("/secrets/:id", asyncHandler(controller.remove));
router.get("/secrets/:id/reveal", asyncHandler(controller.reveal));
router.get("/secrets/:id/versions", asyncHandler(controller.versions));
router.post("/secrets/:id/versions/:version/restore", asyncHandler(controller.restore));

export default router;
