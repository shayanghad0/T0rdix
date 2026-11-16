/**
 * Core domain entities persisted in the JSON database.
 * All timestamps are ISO-8601 strings.
 */

export type UserRole = "ADMIN" | "MEMBER";

/** Shape of the authenticated request user injected by the auth middleware. */
export interface JwtUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  /** Long-lived token for the CLI (`t0rdix login --token`). */
  apiToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  userId: string;
  role: UserRole;
  addedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: ProjectMember[];
  createdAt: string;
  updatedAt: string;
}

export type EnvironmentName = "development" | "staging" | "production";

export interface SecretVersion {
  version: number;
  /** AES-256-GCM encrypted value. */
  encryptedValue: string;
  changedAt: string;
  changedBy: string;
}

export interface Secret {
  id: string;
  projectId: string;
  environment: EnvironmentName;
  key: string;
  /** AES-256-GCM encrypted current value. */
  encryptedValue: string;
  /** Full version history (values stay encrypted). */
  versions: SecretVersion[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type ErrorMode = "none" | "random" | "always";

export interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  /** e.g. `/users/:id` — `:id` segments are matched as wildcards. */
  path: string;
  statusCode: number;
  /** Artificial latency applied before responding (ms, max 10 000). */
  delayMs: number;
  description: string;
  headers: Record<string, string>;
  /** Raw body as authored by the user (JSON, plain text…). */
  responseBody: string;
  errorMode: ErrorMode;
  /** Status returned when the error simulation kicks in. */
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

export type AuthType = "none" | "bearer" | "basic";

export interface RequestAuth {
  type: AuthType;
  token?: string;
  username?: string;
  password?: string;
}

export interface CollectionRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  /** Raw request body string (JSON / text). */
  body: string;
  auth: RequestAuth;
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

export type LogType = "api" | "user" | "secret";

export interface LogEntry {
  id: string;
  type: LogType;
  projectId?: string;
  userId?: string;
  /** Human readable actor, e.g. email or `mock-gateway`. */
  actor: string;
  action: string;
  method?: HttpMethod;
  path?: string;
  status?: number;
  durationMs?: number;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface AppSettings {
  id: "app";
  version: number;
  seededAt: string;
  /** Free-form application settings, merged on PATCH. */
  values: Record<string, unknown>;
}
