import { db, newId, nowIso } from "../database/db";
import type { ApiEndpoint, HttpMethod, MockApi } from "../types";
import { ApiError } from "../utils/api-error";
import { writeLog } from "./log.service";
import type { JwtUser } from "../utils/jwt";

export const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function assertMethod(method: string): HttpMethod {
  const upper = method.toUpperCase() as HttpMethod;
  if (!HTTP_METHODS.includes(upper)) {
    throw ApiError.badRequest(`Method must be one of ${HTTP_METHODS.join(", ")}`);
  }
  return upper;
}

const clampDelay = (value: number) => Math.max(0, Math.min(Math.round(value), 10_000));
const clampStatus = (value: number, fallback: number) =>
  Number.isInteger(value) && value >= 100 && value <= 599 ? value : fallback;

export interface EndpointInput {
  method: string;
  path: string;
  statusCode?: number;
  delayMs?: number;
  description?: string;
  headers?: Record<string, string>;
  responseBody?: string;
  errorMode?: ApiEndpoint["errorMode"];
  errorStatus?: number;
  enabled?: boolean;
}

export function normalizeEndpointInput(input: EndpointInput): Partial<ApiEndpoint> {
  const path = input.path.trim().startsWith("/") ? input.path.trim() : `/${input.path.trim()}`;
  if (!/^\/[A-Za-z0-9\-._~:/{},=%]*$/.test(path.replace(/:[A-Za-z0-9_]+/g, ":param"))) {
    throw ApiError.badRequest(`Invalid endpoint path: ${input.path}`);
  }

  return {
    method: assertMethod(input.method),
    path,
    statusCode: clampStatus(input.statusCode ?? 200, 200),
    delayMs: clampDelay(input.delayMs ?? 0),
    description: input.description?.trim() ?? "",
    headers: input.headers ?? {},
    responseBody: input.responseBody ?? "",
    errorMode: input.errorMode ?? "none",
    errorStatus: clampStatus(input.errorStatus ?? 500, 500),
    enabled: input.enabled ?? true,
  };
}

export interface EndpointDTO extends Omit<ApiEndpoint, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

function findApi(apiId: string): Promise<MockApi> {
  return db.apis.byId(apiId).then((api) => {
    if (!api) throw ApiError.notFound("API not found");
    return api;
  });
}

/* ---------------------------------- APIs ---------------------------------- */

export async function listApis(projectId: string): Promise<MockApi[]> {
  const apis = await db.apis.find((api) => api.projectId === projectId);
  return apis.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getApi(apiId: string): Promise<MockApi> {
  return findApi(apiId);
}

export async function createApi(
  projectId: string,
  user: JwtUser,
  input: { name: string; description?: string },
): Promise<MockApi> {
  const api: MockApi = {
    id: newId(),
    projectId,
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    endpoints: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await db.apis.insert(api);
  await writeLog({
    type: "user",
    actor: user.email,
    userId: user.id,
    projectId,
    action: "api.created",
    meta: { api: api.name },
  });
  return api;
}

export async function updateApi(
  apiId: string,
  patch: { name?: string; description?: string },
): Promise<MockApi> {
  await findApi(apiId);
  const updated = await db.apis.update(apiId, {
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.description !== undefined ? { description: patch.description.trim() } : {}),
    updatedAt: nowIso(),
  });
  if (!updated) throw ApiError.notFound("API not found");
  return updated;
}

export async function deleteApi(apiId: string): Promise<void> {
  const removed = await db.apis.remove(apiId);
  if (!removed) throw ApiError.notFound("API not found");
}

/* -------------------------------- Endpoints ------------------------------- */

export async function addEndpoint(apiId: string, input: EndpointInput): Promise<ApiEndpoint> {
  const api = await findApi(apiId);
  const endpoint: ApiEndpoint = {
    id: newId(),
    ...normalizeEndpointInput(input),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  } as ApiEndpoint;

  // Guard against duplicate method+path within the same API.
  const duplicate = api.endpoints.find(
    (existing) => existing.method === endpoint.method && existing.path === endpoint.path,
  );
  if (duplicate) {
    throw ApiError.conflict(`${endpoint.method} ${endpoint.path} already exists in this API`);
  }

  api.endpoints.push(endpoint);
  const updated = await db.apis.update(apiId, { endpoints: api.endpoints, updatedAt: nowIso() });
  if (!updated) throw ApiError.notFound("API not found");
  return endpoint;
}

export async function updateEndpoint(
  endpointId: string,
  patch: Partial<EndpointInput>,
): Promise<ApiEndpoint> {
  let target: { api: MockApi; endpoint: ApiEndpoint } | undefined;
  for (const api of await db.apis.all()) {
    const endpoint = api.endpoints.find((candidate) => candidate.id === endpointId);
    if (endpoint) target = { api, endpoint };
  }
  if (!target) throw ApiError.notFound("Endpoint not found");

  const normalized = normalizeEndpointInput({ ...target.endpoint, ...patch } as EndpointInput);
  const others = target.api.endpoints.filter((existing) => existing.id !== endpointId);
  const duplicate = others.find(
    (existing) => existing.method === normalized.method && existing.path === normalized.path,
  );
  if (duplicate) {
    throw ApiError.conflict(`${normalized.method} ${normalized.path} already exists in this API`);
  }

  const endpoints = target.api.endpoints.map((existing) =>
    existing.id === endpointId ? { ...existing, ...normalized, updatedAt: nowIso() } : existing,
  );
  await db.apis.update(target.api.id, { endpoints, updatedAt: nowIso() });
  return endpoints.find((existing) => existing.id === endpointId)!;
}

export async function deleteEndpoint(endpointId: string): Promise<void> {
  for (const api of await db.apis.all()) {
    const endpoints = api.endpoints.filter((existing) => existing.id !== endpointId);
    if (endpoints.length !== api.endpoints.length) {
      await db.apis.update(api.id, { endpoints, updatedAt: nowIso() });
      return;
    }
  }
  throw ApiError.notFound("Endpoint not found");
}

/* ------------------------------ Mock gateway ------------------------------ */

export interface MockMatch {
  endpoint: ApiEndpoint;
  params: Record<string, string>;
}

/**
 * Match a request path against configured endpoints.
 * `:param` segments behave as wildcards; the most literal match wins.
 */
export function matchEndpoint(
  endpoints: ApiEndpoint[],
  method: string,
  segments: string[],
): MockMatch | undefined {
  const upper = method.toUpperCase();
  const candidates: MockMatch[] = [];

  for (const endpoint of endpoints) {
    if (!endpoint.enabled || endpoint.method !== upper) continue;
    const pattern = endpoint.path.split("/").filter(Boolean);
    if (pattern.length !== segments.length) continue;

    const params: Record<string, string> = {};
    let literalCount = 0;
    let ok = true;

    for (let i = 0; i < pattern.length; i += 1) {
      const expected = pattern[i];
      const actual = decodeURIComponent(segments[i]);
      if (expected.startsWith(":")) {
        params[expected.slice(1)] = actual;
      } else if (expected.toLowerCase() !== actual.toLowerCase()) {
        ok = false;
        break;
      } else {
        literalCount += 1;
      }
    }
    if (ok) candidates.push({ endpoint, params });

    void literalCount;
  }

  if (candidates.length === 0) return undefined;

  // Prefer endpoints with the most literal (non-param) segments.
  const score = (match: MockMatch) =>
    match.endpoint.path.split("/").filter((segment) => segment && !segment.startsWith(":")).length;
  candidates.sort((a, b) => score(b) - score(a));
  return candidates[0];
}

export interface MockResult {
  endpoint: ApiEndpoint;
  status: number;
  body: string;
  headers: Record<string, string>;
}

/** Simulate latency and errors, then produce the response payload. */
export function simulateResponse(match: MockMatch): MockResult {
  const { endpoint } = match;

  const isError =
    endpoint.errorMode === "always" ||
    (endpoint.errorMode === "random" && Math.random() < 0.3);

  const status = isError ? endpoint.errorStatus : endpoint.statusCode;
  const body = isError ? JSON.stringify({ error: "SIMULATED_ERROR", statusCode: status }, null, 2) : endpoint.responseBody;

  const headers: Record<string, string> = { ...endpoint.headers, "x-powered-by": "T0rdix Mock" };
  if (!Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
    headers["content-type"] = "application/json";
  }

  return { endpoint, status, body, headers };
}

export function delay(ms: number): Promise<void> {
  return ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));
}

/** All endpoints of a project (used by the gateway + public discovery). */
export async function endpointsForProject(projectId: string): Promise<ApiEndpoint[]> {
  const apis = await db.apis.find((api) => api.projectId === projectId);
  return apis.flatMap((api) => api.endpoints);
}

export async function logMockCall(input: {
  projectId: string;
  actor: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
}): Promise<void> {
  await writeLog({
    type: "api",
    projectId: input.projectId,
    actor: input.actor,
    action: "mock.request",
    method: assertMethod(input.method),
    path: input.path,
    status: input.status,
    durationMs: input.durationMs,
    meta: { gateway: "mock" },
  });
}
