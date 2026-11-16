import { Router } from "express";
import * as controller from "../controllers/project.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(controller.list));
router.post("/", asyncHandler(controller.create));
router.get("/:id/overview", asyncHandler(controller.overview));
router.patch("/:id", asyncHandler(controller.update));
router.delete("/:id", asyncHandler(controller.remove));
router.post("/:id/members", asyncHandler(controller.addMember));
router.delete("/:id/members/:userId", asyncHandler(controller.removeMember));

export default router;
