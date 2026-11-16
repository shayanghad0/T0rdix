import { db } from "../database/db";
import type { AppSettings } from "../types";
import { ApiError } from "../utils/api-error";
import { writeLog } from "./log.service";

/** Simple typed wrapper around the settings.json free-form store. */
export async function getSettings(): Promise<AppSettings> {
  const [settings] = await db.settings.all();
  if (!settings) throw ApiError.internal("Settings collection is missing");
  return settings;
}

export async function updateSettings(
  userEmail: string,
  patch: Record<string, unknown>,
): Promise<AppSettings> {
  const current = await getSettings();
  const updated = await db.settings.update(current.id, {
    values: { ...current.values, ...patch },
  });
  if (!updated) throw ApiError.internal("Failed to update settings");

  await writeLog({
    type: "user",
    actor: userEmail,
    action: "settings.updated",
    meta: { keys: Object.keys(patch) },
  });
  return updated;
}
