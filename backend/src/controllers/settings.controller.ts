import type { Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import { getSettings, updateSettings } from "../services/settings.service";
import { settingsPatchSchema } from "../validation/schemas";

/** GET /api/settings */
export async function show(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const settings = await getSettings();
  res.json({ success: true, data: settings });
}

/** PATCH /api/settings — ADMIN only. */
export async function update(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  if (req.user.role !== "ADMIN") {
    throw ApiError.forbidden("Only ADMINs can change application settings");
  }
  const patch = settingsPatchSchema.parse(req.body);
  const settings = await updateSettings(req.user.email, patch);
  res.json({ success: true, data: settings });
}
