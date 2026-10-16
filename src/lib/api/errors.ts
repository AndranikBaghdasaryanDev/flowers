/** Error codes returned by the API in `{ error: { code, message, fields? } }`. */
export type ApiErrorCode =
  | "bad_request"
  | "validation_error"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "payload_too_large"
  | "unsupported_media_type"
  | "service_unavailable"
  | "internal_error";

export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fields?: FieldErrors;
  readonly meta?: Record<string, unknown>;

  constructor(status: number, code: ApiErrorCode, message: string, fields?: FieldErrors, meta?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.meta = meta;
  }

  static badRequest(message: string, fields?: FieldErrors) {
    return new ApiError(400, "bad_request", message, fields);
  }
  static validation(message: string, fields?: FieldErrors) {
    return new ApiError(422, "validation_error", message, fields);
  }
  static unauthenticated(message = "Please sign in to continue.") {
    return new ApiError(401, "unauthenticated", message);
  }
  static forbidden(message = "You do not have permission to perform this action.") {
    return new ApiError(403, "forbidden", message);
  }
  static notFound(message = "Not found.") {
    return new ApiError(404, "not_found", message);
  }
  static conflict(message: string, meta?: Record<string, unknown>) {
    return new ApiError(409, "conflict", message, undefined, meta);
  }
  static rateLimited(retryAfterSeconds: number) {
    return new ApiError(429, "rate_limited", "Too many attempts. Please wait a moment and try again.", undefined, {
      retryAfter: retryAfterSeconds,
    });
  }
}
