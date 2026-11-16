import type { Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import * as secretService from "../services/secret.service";
import {
  bulkSecretsSchema,
  createSecretSchema,
  updateSecretSchema,
} from "../validation/schemas";
import type { EnvironmentName } from "../types";

function assertUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

function envQuery(req: Request): string | undefined {
  const value = req.query.env as string | undefined;
  return value && value !== "all" ? value : undefined;
}

export async function list(req: Request, res: Response): Promise<void> {
  const data = await secretService.listSecrets({
    projectId: req.params.projectId,
    environment: envQuery(req),
    query: req.query.q as string | undefined,
  });
  res.json({ success: true, data });
}

export async function create(req: Request, res: Response): Promise<void> {
  const user = assertUser(req);
  const input = createSecretSchema.parse(req.body);
  const secret = await secretService.createSecret(user, { ...input, projectId: req.params.projectId });
  res.status(201).json({ success: true, data: secret });
}

export async function bulkUpsert(req: Request, res: Response): Promise<void> {
  const user = assertUser(req);
  const { items } = bulkSecretsSchema.parse(req.body);
  const result = await secretService.bulkUpsert(user, req.params.projectId, items);
  res.json({ success: true, data: result });
}

export async function update(req: Request, res: Response): Promise<void> {
  const user = assertUser(req);
  const patch = updateSecretSchema.parse(req.body);
  const secret = await secretService.updateSecret(user, req.params.id, patch);
  res.json({ success: true, data: secret });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const user = assertUser(req);
  await secretService.deleteSecret(user, req.params.id);
  res.json({ success: true, data: { deleted: true } });
}

export async function reveal(req: Request, res: Response): Promise<void> {
  const user = assertUser(req);
  const value = await secretService.revealSecret(user, req.params.id);
  res.json({ success: true, data: { value } });
}

export async function versions(req: Request, res: Response): Promise<void> {
  const user = assertUser(req);
  const data = await secretService.listVersions(user, req.params.id);
  res.json({ success: true, data });
}

export async function restore(req: Request, res: Response): Promise<void> {
  const user = assertUser(req);
  const version = Number.parseInt(req.params.version, 10);
  if (!Number.isFinite(version)) throw ApiError.badRequest("Invalid version");
  const secret = await secretService.restoreVersion(user, req.params.id, version);
  res.json({ success: true, data: secret });
}

/** GET /api/projects/:projectId/secrets/export — dotenv text download. */
export async function exportDotenv(req: Request, res: Response): Promise<void> {
  assertUser(req);
  const environment = secretService.assertEnvironment((req.query.env as string) ?? "development") as EnvironmentName;
  const content = await secretService.exportAsDotenv(req.params.projectId, environment);
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.setHeader(
    "content-disposition",
    `attachment; filename=".env.${environment}"`,
  );
  res.send(content);
}
