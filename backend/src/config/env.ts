import path from "node:path";
import dotenv from "dotenv";

// Load backend/.env when present (repo root .env is also supported).
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Central runtime configuration. Everything is overridable through env so the
 * server stays a zero-config "npm run dev" experience while remaining
 * production-friendly.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  port: int(process.env.PORT, 5000),
  /** Additional CORS origin for the frontend dev server. */
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET ?? "t0rdix-dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "30d",
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  databaseDir: process.env.DATABASE_DIR ?? "",
} as const;
