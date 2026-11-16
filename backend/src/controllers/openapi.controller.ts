import type { Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import * as openApiService from "../services/openapi.service";
import * as projectService from "../services/project.service";
import { importOpenApiSchema } from "../validation/schemas";

function assertUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

/** POST /api/projects/:projectId/import/openapi */
export async function importOpenApi(req: Request, res: Response): Promise<void> {
  const user = assertUser(req);
  const { content } = importOpenApiSchema.parse(req.body);
  const report = await openApiService.importOpenApi(req.params.projectId, user, content);
  res.status(201).json({ success: true, data: report });
}

/** GET /api/projects/:projectId/openapi — generated OpenAPI 3 document. */
export async function exportOpenApi(req: Request, res: Response): Promise<void> {
  const user = assertUser(req);
  const { project } = await projectService.requireProjectAccess(req.params.projectId, user);
  const document = await openApiService.exportOpenApi(project.id, project.name);

  if (req.query.download === "1") {
    res.setHeader("content-disposition", `attachment; filename="openapi.json"`);
  }
  res.json(document);
}
