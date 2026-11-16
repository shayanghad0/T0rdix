import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { rateLimit } from "../middleware/rate-limit";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

router.post(
  "/register",
  rateLimit({ windowMs: 60_000, max: 20, name: "auth" }),
  asyncHandler(authController.register),
);
router.post(
  "/login",
  rateLimit({ windowMs: 60_000, max: 20, name: "auth" }),
  asyncHandler(authController.login),
);
router.get("/me", requireAuth, asyncHandler(authController.me));
router.patch("/me", requireAuth, asyncHandler(authController.updateMe));
router.post("/me/token", requireAuth, asyncHandler(authController.issueToken));
router.delete("/me/token", requireAuth, asyncHandler(authController.revokeToken));

export default router;
