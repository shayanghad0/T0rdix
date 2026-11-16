/**
 * Typed application errors used across the service/controller layers.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, "VALIDATION_ERROR", message, details);
  }

  static unauthorized(message = "Authentication required"): ApiError {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "You do not have permission to do this"): ApiError {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Resource not found"): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, "CONFLICT", message);
  }

  static rateLimited(retryAfterMs: number): ApiError {
    return new ApiError(429, "RATE_LIMITED", `Too many requests, slow down (retry in ${Math.ceil(retryAfterMs / 1000)}s)`);
  }

  static internal(message = "Something went wrong"): ApiError {
    return new ApiError(500, "INTERNAL", message);
  }
}
