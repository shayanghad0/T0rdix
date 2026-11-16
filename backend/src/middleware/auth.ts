import type { NextFunction, Request, RequestHandler, Response } from "express";
import { verifyToken } from "../utils/jwt";
import { ApiError } from "../utils/api-error";
import type { UserRole } from "../types";

/** Require a valid `Authorization: Bearer <token>` header (JWT or CLI api-token). */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    next(ApiError.unauthorized());
    return;
  }

  // CLI long-lived tokens (`t0rdix_*`) authenticate directly against users.json.
  if (token.startsWith("t0rdix_")) {
    void (async () => {
      const { userByApiToken, toPublicUser } = await import("../services/user.service");
      const user = await userByApiToken(token);
      if (!user) {
        next(ApiError.unauthorized("Invalid API token"));
        return;
      }
      req.user = { id: user.id, email: user.email, role: user.role };
      next();
    })().catch(next);
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : ApiError.unauthorized());
  }
}

/** Restrict a route to specific global roles. */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden(`This action requires role: ${roles.join(" or ")}`));
      return;
    }
    next();
  };
}
