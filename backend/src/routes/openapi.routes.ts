import { Router } from "express";
import * as controller from "../controllers/openapi.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

const router = Router();
router.use(requireAuth);

router.post("/projects/:projectId/import/openapi", asyncHandler(controller.importOpenApi));
router.get("/projects/:projectId/openapi", asyncHandler(controller.exportOpenApi));

export default router;
