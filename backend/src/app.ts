import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { env } from "./config/env";

/**
 * Express application factory (kept separate from `server.ts` for testability).
 */
export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: env.isProd ? undefined : false,
    }),
  );

  // A local-first devtool: permissive CORS so mock endpoints and the CLI work
  // from anywhere on the developer's machine. See SECURITY.md.
  app.use(
    cors({
      origin: (origin, callback) => callback(null, true),
      credentials: false,
    }),
  );

  app.use(express.json({ limit: "6mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
