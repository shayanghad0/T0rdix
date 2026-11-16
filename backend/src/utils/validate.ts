import type { z } from "zod";
import { ApiError } from "./api-error";

/** Validate a body with a schema, converting Zod failures to ApiError(400). */
export function validate<T extends z.ZodTypeAny>(schema: T, payload: unknown): z.infer<T> {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw ApiError.badRequest(
      "Request validation failed",
      result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    );
  }
  return result.data;
}
