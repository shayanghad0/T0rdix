/**
 * T0rdix CLI — thin HTTP client for the local T0rdix server.
 * Uses only Node built-ins plus dotenv.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { env } from "node:process";

const HOME = os.homedir();
const CONFIG_DIR = path.join(HOME, ".t0rdix");
const TOKEN_FILE = path.join(CONFIG_DIR, "token");
const SERVER_FILE = path.join(CONFIG_DIR, "server");

export function serverUrl(): string {
  if (env.T0RDIX_SERVER) return env.T0RDIX_SERVER.replace(/\/$/, "");
  try {
    if (fs.existsSync(SERVER_FILE)) return fs.readFileSync(SERVER_FILE, "utf8").trim() || "http://localhost:5000";
  } catch {
    /* ignore */
  }
  return "http://localhost:5000";
}

export function setServerUrl(url: string): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(SERVER_FILE, url.replace(/\/$/, ""), "utf8");
}

export class CliError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function loadToken(): string | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) return fs.readFileSync(TOKEN_FILE, "utf8").trim() || null;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveToken(token: string): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(TOKEN_FILE, token, "utf8");
  // Restrict on POSIX where supported.
  try {
    fs.chmodSync(TOKEN_FILE, 0o600);
  } catch {
    /* Windows lacks chmod; acceptable for a local tool */
  }
}

export function clearToken(): void {
  try {
    if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
  } catch {
    /* ignore */
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  token?: string;
  raw?: boolean;
}

export async function request<T>(apiPath: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, token, raw = false } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  const bearer = token ?? loadToken();
  if (auth && bearer) headers.authorization = `Bearer ${bearer}`;

  let response: Response;
  try {
    response = await fetch(`${serverUrl()}/api${apiPath}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new CliError(0, `Cannot reach T0rdix server at ${serverUrl()} — is the backend running? (npm run dev:backend)`);
  }

  if (raw) return (await response.text()) as unknown as T;

  const payload = (await response.json().catch(() => null)) as
    | { data?: T; error?: { message?: string } }
    | null;

  if (!response.ok) {
    throw new CliError(response.status, payload?.error?.message ?? `Request failed (${response.status})`);
  }
  return (payload?.data ?? (payload as unknown)) as T;
}

export interface ProjectDto {
  id: string;
  name: string;
  description: string;
}

export const client = {
  /** Email+password login → session token. */
  loginWithEmail: async (email: string, password: string) =>
    request<{ token: string; user: { email: string } }>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),

  /** Validate a token issued from the web app (Settings → CLI access). */
  me: (token: string) =>
    request<{ user: { email: string } }>("/auth/me", {
      token,
      auth: true,
    }).then((data) => data.user ?? data),

  projects: () => request<ProjectDto[]>("/projects"),

  exportDotenv: (projectId: string, environment: string) =>
    request<string>(`/projects/${projectId}/secrets/export?env=${environment}`, { raw: true }),

  bulkPush: (projectId: string, items: { key: string; value: string; environment: string }[]) =>
    request<{ created: number; updated: number }>(`/projects/${projectId}/secrets/bulk`, {
      method: "POST",
      body: { items },
    }),

  createApi: (projectId: string, name: string, description: string) =>
    request<{ id: string; name: string }>(`/projects/${projectId}/apis`, {
      method: "POST",
      body: { name, description },
    }),

  /** AI scaffold + materialize into the project. */
  generateApiFromText: (projectId: string, prompt: string) =>
    request<{ spec: { name: string; description: string; endpoints: { method: string; path: string }[] }; createdApiId: string | null }>(
      `/ai/generate-api?apply=1&projectId=${projectId}`,
      { method: "POST", body: { prompt } },
    ),

  mockDiscovery: (projectId: string) =>
    request<{ project: { name: string }; apis: { name: string; endpoints: { method: string; path: string; status: number }[] }[] }>(
      `/mock/${projectId}`,
      { auth: false },
    ),
};
