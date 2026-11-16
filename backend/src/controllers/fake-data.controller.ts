import type { Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import { generateFakeData } from "../services/fake-data.service";
import { fakeDataSchema } from "../validation/schemas";

/** POST /api/fake-data — generate reproducible sample datasets. */
export async function generate(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const input = fakeDataSchema.parse(req.body);
  const data = generateFakeData(input);
  res.json({ success: true, data, meta: { type: input.type, count: data.length, seed: input.seed ?? null } });
}
