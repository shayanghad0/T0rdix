import type { Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import * as collectionService from "../services/collection.service";
import { forwardRequest } from "../utils/forward";
import { requestSchema, runSchema } from "../validation/schemas";

function assertUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export async function list(req: Request, res: Response): Promise<void> {
  assertUser(req);
  const collections = await collectionService.listCollections(req.params.projectId);
  res.json({ success: true, data: collections });
}

export async function create(req: Request, res: Response): Promise<void> {
  assertUser(req);
  const collection = await collectionService.createCollection(req.params.projectId, req.body ?? {});
  res.status(201).json({ success: true, data: collection });
}

export async function update(req: Request, res: Response): Promise<void> {
  assertUser(req);
  const collection = await collectionService.updateCollection(req.params.id, req.body ?? {});
  res.json({ success: true, data: collection });
}

export async function remove(req: Request, res: Response): Promise<void> {
  assertUser(req);
  await collectionService.deleteCollection(req.params.id);
  res.json({ success: true, data: { deleted: true } });
}

export async function addRequest(req: Request, res: Response): Promise<void> {
  assertUser(req);
  const input = requestSchema.parse(req.body);
  const request = await collectionService.addRequest(req.params.id, input);
  res.status(201).json({ success: true, data: request });
}

export async function updateRequest(req: Request, res: Response): Promise<void> {
  assertUser(req);
  const patch = requestSchema.partial().parse(req.body);
  const request = await collectionService.updateRequest(req.params.id, patch);
  res.json({ success: true, data: request });
}

export async function removeRequest(req: Request, res: Response): Promise<void> {
  assertUser(req);
  await collectionService.deleteRequest(req.params.id);
  res.json({ success: true, data: { deleted: true } });
}

/** POST /api/run — server-side proxy for the testing module (CORS-free). */
export async function run(req: Request, res: Response): Promise<void> {
  assertUser(req);
  const input = runSchema.parse(req.body);
  const result = await forwardRequest({
    method: input.method,
    url: input.url,
    headers: input.headers,
    body: input.body || null,
  });
  res.json({ success: true, data: result });
}
