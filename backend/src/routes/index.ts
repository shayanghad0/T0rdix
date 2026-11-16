import { Router } from "express";
import authRoutes from "./auth.routes";
import projectRoutes from "./project.routes";
import secretRoutes from "./secret.routes";
import apiRoutes from "./api.routes";
import mockRoutes from "./mock.routes";
import collectionRoutes from "./collection.routes";
import openApiRoutes from "./openapi.routes";
import fakeDataRoutes from "./fake-data.routes";
import logRoutes from "./log.routes";
import settingsRoutes from "./settings.routes";
import aiRoutes from "./ai.routes";
import { env } from "../config/env";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      name: "T0rdix API",
      version: "1.0.0",
      status: "ok",
      env: env.nodeEnv,
      uptimeSeconds: Math.floor(process.uptime()),
      now: new Date().toISOString(),
    },
  });
});

// Public mock gateway — intentionally reachable without a token.
router.use("/mock", mockRoutes);

// Public authentication (register / login).
router.use("/auth", authRoutes);

// Everything below requires a valid JWT or CLI API token.
router.use("/projects", projectRoutes);
router.use("/", secretRoutes);
router.use("/", apiRoutes);
router.use("/", collectionRoutes);
router.use("/", openApiRoutes);
router.use("/fake-data", fakeDataRoutes);
router.use("/logs", logRoutes);
router.use("/settings", settingsRoutes);
router.use("/ai", aiRoutes);

export default router;
