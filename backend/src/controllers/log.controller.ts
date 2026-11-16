import type { Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import { queryLogs } from "../services/log.service";
import * as projectService from "../services/project.service";
import type { LogType } from "../types";

const LOG_TYPES: LogType[] = ["api", "user", "secret"];

/** GET /api/logs?projectId=&type=&limit= — scoped to projects the caller belongs to. */
export async function list(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();

  const projectId = req.query.projectId as string | undefined;
  const type = req.query.type as LogType | undefined;
  const limit = Number.parseInt((req.query.limit as string) ?? "50", 10);

  if (type && !LOG_TYPES.includes(type)) {
    throw ApiError.badRequest(`type must be one of ${LOG_TYPES.join(", ")}`);
  }

  if (projectId) {
    await projectService.requireProjectAccess(projectId, req.user);
  } else {
    // Restrict to the caller's projects when no explicit filter is given.
    const projects = await projectService.listProjectsForUser(req.user);
    const ids = new Set(projects.map((project) => project.id));
    const logs = await queryLogs({ type, limit: 500 });
    res.json({ success: true, data: logs.filter((log) => !log.projectId || ids.has(log.projectId)).slice(0, Math.min(Math.max(limit, 1), 200)) });
    return;
  }

  const logs = await queryLogs({ projectId, type, limit });
  res.json({ success: true, data: logs });
}
