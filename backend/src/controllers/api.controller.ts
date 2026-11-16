import type { Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import * as apiService from "../services/api.service";
import { apiSchema, endpointSchema } from "../validation/schemas";

function assertUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export async function list(req: Request, res: Response): Promise<void> {
  const apis = await apiService.listApis(req.params.projectId);
  res.json({ success: true, data: apis });
}

export async function create(req: Request, res: Response): Promise<void> {
  const user = assertUser(req);
  const input = apiSchema.parse(req.body);
  const api = await apiService.createApi(req.params.projectId, user, input);
  res.status(201).json({ success: true, data: api });
}

export async function update(req: Request, res: Response): Promise<void> {
  assertUser(req);
  const patch = apiSchema.partial().parse(req.body);
  const api = await apiService.updateApi(req.params.id, patch);
  res.json({ success: true, data: api });
}

export async function remove(req: Request, res: Response): Promise<void> {
  assertUser(req);
  await apiService.deleteApi(req.params.id);
  res.json({ success: true, data: { deleted: true } });
}

export async function addEndpoint(req: Request, res: Response): Promise<void> {
  assertUser(req);
  const input = endpointSchema.parse(req.body);
  const endpoint = await apiService.addEndpoint(req.params.id, input);
  res.status(201).json({ success: true, data: endpoint });
}

export async function updateEndpoint(req: Request, res: Response): Promise<void> {
  assertUser(req);
  const patch = endpointSchema.partial().parse(req.body);
  const endpoint = await apiService.updateEndpoint(req.params.id, patch);
  res.json({ success: true, data: endpoint });
}

export async function removeEndpoint(req: Request, res: Response): Promise<void> {
  assertUser(req);
  await apiService.deleteEndpoint(req.params.id);
  res.json({ success: true, data: { deleted: true } });
}
