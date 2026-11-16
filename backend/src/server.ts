import { createApp } from "./app";
import { env } from "./config/env";
import { initDatabase } from "./database/db";
import { logger } from "./utils/logger";

async function main(): Promise<void> {
  await initDatabase();

  const app = createApp();

  const server = app.listen(env.port, () => {
    logger.success("─────────────────────────────────────────────");
    logger.success("  T0rdix API is running");
    logger.success(`  API       → http://localhost:${env.port}/api/health`);
    logger.success(`  Mock base → http://localhost:${env.port}/api/mock/:projectId/...`);
    logger.success(`  Env       → ${env.nodeEnv}`);
    logger.success("─────────────────────────────────────────────");
    if (!env.encryptionKey) {
      logger.warn("ENCRYPTION_KEY not set — using a derived development key. See .env.example.");
    }
  });

  // The "error" event is emitted asynchronously, so attaching it right after
  // listen() still catches a bind failure. Handle the common one (another
  // instance still holds the port) with clear guidance instead of a stack trace.
  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      logger.error(`Port ${env.port} is already in use by another process.`);
      logger.error("It is usually a leftover T0rdix dev session — stop it, or set PORT=... in backend/.env to use another port.");
      logger.error('Tip: "npm run dev" kills stale dev listeners on the ports automatically before starting.');
      process.exit(1);
    }
    logger.error("Server error:", error);
    process.exit(1);
  });

  const shutdown = (): void => {
    logger.info("Shutting down…");
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2_000).unref();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main().catch((error) => {
  logger.error("Fatal startup error:", error);
  process.exit(1);
});
