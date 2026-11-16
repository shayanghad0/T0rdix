import type { Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import { db, nowIso } from "../database/db";
import * as projectService from "../services/project.service";
import { createProjectSchema, memberSchema, updateProjectSchema } from "../validation/schemas";

function assertUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export async function list(req: Request, res: Response): Promise<void> {
  const user = assertUser(req);
  const projects = await projectService.listProjectsForUser(user);
  res.json({ success: true, data: projects });
}

export async function create(req: Request, res: Response): Promise<void> {
  const user = assertUser(req);
  const input = createProjectSchema.parse(req.body);
  const project = await projectService.createProject(user, input);
  res.status(201).json({ success: true, data: project });
}

/** GET /api/projects/:id/overview — aggregated dashboard payload. */
export async function overview(req: Request, res: Response): Promise<void> {
  const user = assertUser(req);
  const { project } = await projectService.requireProjectAccess(req.params.id, user);

  const [secrets, apis, collections, logs] = await Promise.all([
    db.secrets.find((secret) => secret.projectId === project.id),
    db.apis.find((api) => api.projectId === project.id),
    db.collections.find((collection) => collection.projectId === project.id),
    db.logs.find((log) => log.projectId === project.id),
  ]);

  const endpoints = apis.flatMap((api) => api.endpoints);
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const apiCalls24h = logs.filter(
    (log) => log.type === "api" && new Date(log.createdAt).getTime() > dayAgo,
  ).length;

  const members = (await db.users.all()).filter((candidate) =>
    project.members.some((member) => member.userId === candidate.id),
  );

  res.json({
    success: true,
    data: {
      project,
      stats: {
        secretCount: secrets.length,
        environments: [...new Set(secrets.map((secret) => secret.environment))],
        apiCount: apis.length,
        endpointCount: endpoints.length,
        collectionCount: collections.length,
        requestCount: collections.reduce((sum, collection) => sum + collection.requests.length, 0),
        apiCalls24h,
        logCount: logs.length,
      },
      members: members.map((member) => ({
        userId: member.id,
        name: member.name,
        email: member.email,
        role: project.members.find((m) => m.userId === member.id)?.role ?? "MEMBER",
      })),
      endpointPreview: endpoints.slice(0, 8).map((endpoint) => ({
        id: endpoint.id,
        method: endpoint.method,
        path: endpoint.path,
        statusCode: endpoint.statusCode,
        enabled: endpoint.enabled,
      })),
    },
  });
}

export async function update(req: Request, res: Response): Promise<void> {
  const user = assertUser(req);
  const patch = updateProjectSchema.parse(req.body);
  const project = await projectService.updateProject(req.params.id, user, patch);
  res.json({ success: true, data: project });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const user = assertUser(req);
  await projectService.deleteProject(req.params.id, user);
  res.json({ success: true, data: { deleted: true, at: nowIso() } });
}

export async function addMember(req: Request, res: Response): Promise<void> {
  const user = assertUser(req);
  const input = memberSchema.parse(req.body);
  const project = await projectService.addMember(req.params.id, user, input);
  res.status(201).json({ success: true, data: project });
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  const user = assertUser(req);
  const project = await projectService.removeMember(req.params.id, user, req.params.userId);
  res.json({ success: true, data: project });
}
