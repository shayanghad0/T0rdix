import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "./api-error";
import type { UserRole } from "../types";

export type { JwtUser } from "../types";

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
    issuer: "t0rdix",
  });
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.jwtSecret, { issuer: "t0rdix" });
    if (typeof decoded === "string") throw new Error("Unexpected token payload");
    const { sub, email, role } = decoded as jwt.JwtPayload & Partial<JwtPayload>;
    if (!sub || !email || !role) throw new Error("Incomplete token payload");
    return { sub, email, role };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid token";
    throw ApiError.unauthorized(`Invalid or expired token (${message})`);
  }
}
