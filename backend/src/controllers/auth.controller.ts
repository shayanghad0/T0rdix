import type { Request, Response } from "express";
import { signToken } from "../utils/jwt";
import { ApiError } from "../utils/api-error";
import * as userService from "../services/user.service";
import { loginSchema, profileSchema, registerSchema } from "../validation/schemas";
import { userByApiTokenSafe } from "../services/user.helpers";

/** POST /api/auth/register — first account becomes ADMIN. */
export async function register(req: Request, res: Response): Promise<void> {
  const input = registerSchema.parse(req.body);
  const { user } = await userService.register(input);
  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  res.status(201).json({ success: true, data: { token, user } });
}

/** POST /api/auth/login */
export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);

  // Support CLI API tokens as the "password" field too (t0rdix login --token).
  if (input.password.startsWith("t0rdix_")) {
    const tokenUser = await userByApiTokenSafe(input.password);
    if (tokenUser && tokenUser.email === input.email.toLowerCase().trim()) {
      await userService.logLogin(tokenUser, "token");
      res.json({
        success: true,
        data: { token: input.password, user: userService.toPublicUser(tokenUser) },
      });
      return;
    }
  }

  const user = await userService.authenticate(input);
  await userService.logLogin(user, "password");
  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  res.json({ success: true, data: { token, user: userService.toPublicUser(user) } });
}

/** GET /api/auth/me */
export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const user = await userService.getUserById(req.user.id);
  if (!user) throw ApiError.unauthorized("Account no longer exists");
  res.json({ success: true, data: { user: userService.toPublicUser(user) } });
}

/** PATCH /api/auth/me */
export async function updateMe(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const patch = profileSchema.parse(req.body);
  const user = await userService.updateProfile(req.user.id, patch);
  res.json({ success: true, data: { user } });
}

/** POST /api/auth/me/token — issue/rotate a CLI token. */
export async function issueToken(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const token = await userService.issueApiToken(req.user.id);
  res.status(201).json({ success: true, data: { token } });
}

/** DELETE /api/auth/me/token */
export async function revokeToken(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  await userService.revokeApiToken(req.user.id);
  res.json({ success: true, data: { ok: true } });
}
