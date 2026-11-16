/** Shared client-side domain types mirroring the backend contracts. */

export type UserRole = "ADMIN" | "MEMBER";
export type EnvironmentName = "development" | "staging" | "production";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type ErrorMode = "none" | "random" | "always";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hasApiToken: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: { userId: string; role: UserRole; addedAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectOverview {
  project: Project;
  stats: {
    secretCount: number;
    environments: EnvironmentName[];
    apiCount: number;
    endpointCount: number;
    collectionCount: number;
    requestCount: number;
    apiCalls24h: number;
    logCount: number;
  };
  members: { userId: string; name: string; email: string; role: UserRole }[];
  endpointPreview: { id: string; method: HttpMethod; path: string; statusCode: number; enabled: boolean }[];
}

export interface SecretDTO {
  id: string;
  projectId: string;
  environment: EnvironmentName;
  key: string;
  encryptedValue: string;
  version: number;
  versionsCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecretVersion {
  version: number;
  value: string | null;
  changedAt: string;
  changedBy: string;
}

export interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  statusCode: number;
  delayMs: number;
  description: string;
  headers: Record<string, string>;
  responseBody: string;
  errorMode: ErrorMode;
  errorStatus: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MockApi {
  id: string;
  projectId: string;
  name: string;
  description: string;
  endpoints: ApiEndpoint[];
  createdAt: string;
  updatedAt: string;
}

export interface CollectionRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  body: string;
  auth: { type: "none" | "bearer" | "basic"; token?: string; username?: string; password?: string };
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  projectId: string;
  name: string;
  description: string;
  requests: CollectionRequest[];
  createdAt: string;
  updatedAt: string;
}

export interface ForwardedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timeMs: number;
  sizeBytes: number;
}

export type LogType = "api" | "user" | "secret";

export interface LogEntry {
  id: string;
  type: LogType;
  projectId?: string;
  userId?: string;
  actor: string;
  action: string;
  method?: HttpMethod;
  path?: string;
  status?: number;
  durationMs?: number;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface ImportReport {
  apiName: string;
  endpointsCreated: number;
  collectionCreated?: string;
  warnings: string[];
}

export interface FakeDataRow {
  [key: string]: unknown;
}

export const ENVIRONMENTS: EnvironmentName[] = ["development", "staging", "production"];

export const HTTP_METHOD_COLORS: Record<HttpMethod | "HEAD" | "OPTIONS", string> = {
  GET: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  POST: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  PUT: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  PATCH: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  DELETE: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  HEAD: "text-slate-400 bg-slate-400/10 border-slate-400/20",
  OPTIONS: "text-slate-400 bg-slate-400/10 border-slate-400/20",
};
