import crypto from "node:crypto";
import { env } from "../config/env";
import { logger } from "./logger";

const FALLBACK_SALT = "t0rdix::local-key-derivation";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  if (env.encryptionKey) {
    if (!/^[0-9a-fA-F]{64}$/.test(env.encryptionKey)) {
      logger.warn("ENCRYPTION_KEY must be 64 hex characters (32 bytes). Falling back to derived key.");
    } else {
      cachedKey = Buffer.from(env.encryptionKey, "hex");
      return cachedKey;
    }
  }

  // Development fallback: derive a stable key from the JWT secret.
  logger.warn(
    "ENCRYPTION_KEY is not set — deriving a development key from JWT_SECRET. " +
      "Secrets encrypted now will become unreadable if you set a real key later.",
  );
  cachedKey = crypto.scryptSync(env.jwtSecret, FALLBACK_SALT, 32);
  return cachedKey;
}

/**
 * AES-256-GCM encryption for secret values at rest.
 * Wire format: base64(iv) . base64(authTag) . base64(ciphertext)
 */
export function encryptSecret(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const [ivPart, tagPart, dataPart] = payload.split(".");
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Malformed encrypted payload");
  }
  const iv = Buffer.from(ivPart, "base64");
  const tag = Buffer.from(tagPart, "base64");
  const data = Buffer.from(dataPart, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** True when the payload looks like it was produced by `encryptSecret`. */
export function isEncrypted(value: string): boolean {
  return /^[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*$/.test(value);
}

/** Cryptographically strong random token (URL/hex safe). */
export function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/** Random but human-typeable secret value generator (used by the UI's dice button). */
export function generateReadableSecret(length = 32): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return out;
}
