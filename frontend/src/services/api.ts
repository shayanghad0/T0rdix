/**
 * Thin fetch wrapper around the T0rdix API.
 * - Attaches the JWT from the auth store.
 * - Normalizes errors into `ApiClientError` for toasts/forms.
 */
import { useAuthStore } from "@/stores/auth-store";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: { path: string; message: string }[];

  constructor(status: number, code: string, message: string, details?: { path: string; message: string }[]) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | undefined>;
  /** Skip attaching Authorization (auth endpoints). */
  anon?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, anon } = options;

  const url = new URL(`${API_URL}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, value);
  }

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (!anon) {
    const token = useAuthStore.getState().token;
    if (token) headers.authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiClientError(0, "NETWORK", "Cannot reach the T0rdix API — is the backend running on :5000?");
  }

  const isJson = response.headers.get("content-type")?.includes("json");
  const payload: unknown = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const err = (payload as { error?: { code?: string; message?: string; details?: never } } | null)?.error;
    throw new ApiClientError(
      response.status,
      err?.code ?? "ERROR",
      err?.message ?? `Request failed (${response.status})`,
      err?.details,
    );
  }

  return ((payload as { data?: T } | null)?.data ?? payload) as T;
}

export const api = {
  get: <T>(path: string, query?: Record<string, string | undefined>) => apiFetch<T>(path, { query }),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
  /** File downloads (dotenv export) bypass JSON parsing. */
  downloadPath(build: (baseUrl: string) => string): string {
    return build(API_URL);
  },
};
