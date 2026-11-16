import type { Request, Response } from "express";
import { db } from "../database/db";
import {
  delay,
  endpointsForProject,
  logMockCall,
  matchEndpoint,
  simulateResponse,
} from "../services/api.service";

/**
 * Public mock gateway — no auth (it *is* the fake API):
 *   GET    /api/mock/:projectId              → endpoint discovery
 *   ANY    /api/mock/:projectId/<path>       → matched mock response
 */

export async function discovery(req: Request, res: Response): Promise<void> {
  const project = await db.projects.byId(req.params.projectId);
  if (!project) {
    res.status(404).json({ error: "Unknown project", hint: "Check the projectId in the URL." });
    return;
  }
  const apis = await db.apis.find((api) => api.projectId === project.id);
  res.json({
    project: { id: project.id, name: project.name },
    apis: apis.map((api) => ({
      id: api.id,
      name: api.name,
      endpoints: api.endpoints.map((endpoint) => ({
        id: endpoint.id,
        method: endpoint.method,
        path: endpoint.path,
        status: endpoint.statusCode,
        delayMs: endpoint.delayMs,
        enabled: endpoint.enabled,
      })),
    })),
  });
}

export async function gateway(req: Request, res: Response): Promise<void> {
  const startedAt = Date.now();
  const wildcard = req.params[0] ?? "";
  const segments = wildcard.split("/").filter(Boolean);

  const project = await db.projects.byId(req.params.projectId);
  if (!project) {
    res.status(404).json({ error: "Unknown mock project", projectId: req.params.projectId });
    return;
  }

  const endpoints = await endpointsForProject(project.id);
  const match = matchEndpoint(endpoints, req.method, segments);

  if (!match) {
    const durationMs = Date.now() - startedAt;
    await logMockCall({
      projectId: project.id,
      actor: "mock-gateway",
      method: req.method,
      path: `/${wildcard}`,
      status: 404,
      durationMs,
    });
    res.status(404).json({
      error: "NO_MATCHING_ENDPOINT",
      message: `No mock endpoint matches ${req.method} /${wildcard}`,
      hint: "Check the API Mock Studio for available routes.",
    });
    return;
  }

  const result = simulateResponse(match);
  await delay(match.endpoint.delayMs);
  const durationMs = Date.now() - startedAt;

  await logMockCall({
    projectId: project.id,
    actor: "mock-gateway",
    method: req.method,
    path: `/${wildcard}`,
    status: result.status,
    durationMs,
  });

  // Content negotiation: JSON when parseable, raw text otherwise.
  let payload: unknown = result.body;
  const contentType = result.headers["content-type"] ?? result.headers["Content-Type"] ?? "";
  if (contentType.includes("json")) {
    try {
      payload = JSON.parse(result.body || "null");
    } catch {
      payload = result.body;
    }
  }

  res.status(result.status).set(result.headers).send(payload);
}
