import { ApiError } from "./api-error";

export interface ForwardedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timeMs: number;
  sizeBytes: number;
}

/**
 * Server-side HTTP forwarder used by the API Testing module (avoids browser
 * CORS when sending test requests) and available to future automation.
 */
export async function forwardRequest(options: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string | null;
  timeoutMs?: number;
}): Promise<ForwardedResponse> {
  const { method, url, headers = {}, body, timeoutMs = 15_000 } = options;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw ApiError.badRequest(`Invalid URL: ${url}`);
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw ApiError.badRequest("Only http and https URLs are supported");
  }

  // Block receives from RFC-1918/metadata ranges when the host clearly points
  // at cloud metadata endpoints — a small but meaningful SSRF guard.
  const host = parsedUrl.hostname;
  if (/(^|\.)(169\.254\.169\.254|metadata\.google\.internal)$/.test(host)) {
    throw ApiError.forbidden("Requests to cloud metadata endpoints are blocked");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(parsedUrl, {
      method,
      headers,
      body: body !== null && body !== undefined && method !== "GET" && method !== "HEAD" ? body : undefined,
      signal: controller.signal,
      redirect: "follow",
    });

    const text = await response.text();
    const flatHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      flatHeaders[key] = value;
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: flatHeaders,
      body: text,
      timeMs: Date.now() - startedAt,
      sizeBytes: Buffer.byteLength(text, "utf8"),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw ApiError.badRequest(`Request timed out after ${timeoutMs}ms`);
    }
    const message = error instanceof Error ? error.message : "Network error";
    throw ApiError.badRequest(`Request failed: ${message}`);
  } finally {
    clearTimeout(timer);
  }
}
