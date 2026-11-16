import type { RequestHandler } from "express";
import { ApiError } from "../utils/api-error";
import { randomToken } from "../utils/crypto";

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map does not grow forever.
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((ts) => ts > cutoff);
    if (bucket.hits.length === 0) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref();

/**
 * Lightweight in-memory sliding-window rate limiter (no external store since
 * the storage rule of this project is "no external services").
 */
export function rateLimit(options: { windowMs: number; max: number; name: string }): RequestHandler {
  const { windowMs, max, name } = options;

  return (req, _res, next) => {
    const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
      ?? req.ip
      ?? "unknown";
    const key = `${name}:${ip}`;
    const now = Date.now();

    const bucket = buckets.get(key) ?? { hits: [] };
    bucket.hits = bucket.hits.filter((ts) => now - ts < windowMs);

    if (bucket.hits.length >= max) {
      buckets.set(key, bucket);
      next(ApiError.rateLimited(windowMs));
      return;
    }

    bucket.hits.push(now);
    buckets.set(key, bucket);
    next();
  };
}
