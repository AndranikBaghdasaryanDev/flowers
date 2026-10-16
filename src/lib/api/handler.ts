import "server-only";
import { NextResponse, connection, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import mongoose from "mongoose";
import { connectDb, DatabaseUnavailableError } from "@/lib/db";
import { env } from "@/lib/env";
import { ApiError, type FieldErrors } from "@/lib/api/errors";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import type { Permission } from "@/lib/domain/roles";
import { hasPermission } from "@/lib/domain/roles";
import { logger } from "@/lib/logger";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_JSON_BYTES = 1024 * 1024;

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function zodFieldErrors(error: ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

function errorResponse(error: unknown, req: NextRequest): NextResponse {
  if (error instanceof ApiError) {
    const headers: Record<string, string> = {};
    if (error.code === "rate_limited" && typeof error.meta?.retryAfter === "number") {
      headers["Retry-After"] = String(error.meta.retryAfter);
    }
    return NextResponse.json(
      { error: { code: error.code, message: error.message, fields: error.fields, meta: error.meta } },
      { status: error.status, headers },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Please check the highlighted fields.", fields: zodFieldErrors(error) } },
      { status: 422 },
    );
  }
  if (error instanceof DatabaseUnavailableError || error instanceof mongoose.Error.MongooseServerSelectionError) {
    logger.error("database unavailable", { path: req.nextUrl.pathname, error });
    return NextResponse.json(
      { error: { code: "service_unavailable", message: "The service is temporarily unavailable. Please try again shortly." } },
      { status: 503 },
    );
  }
  if (isDuplicateKeyError(error)) {
    return NextResponse.json(
      { error: { code: "conflict", message: "A record with the same unique value already exists." } },
      { status: 409 },
    );
  }
  if (error instanceof mongoose.Error.ValidationError) {
    const fields: FieldErrors = {};
    for (const [key, value] of Object.entries(error.errors)) fields[key] = value.message;
    return NextResponse.json({ error: { code: "validation_error", message: "Invalid data.", fields } }, { status: 422 });
  }
  if (error instanceof mongoose.Error.CastError) {
    return NextResponse.json({ error: { code: "not_found", message: "Not found." } }, { status: 404 });
  }
  logger.error("unhandled API error", { path: req.nextUrl.pathname, method: req.method, error });
  return NextResponse.json(
    { error: { code: "internal_error", message: "Something went wrong on our side. Please try again." } },
    { status: 500 },
  );
}

export function isDuplicateKeyError(error: unknown): error is { code: number; keyPattern?: Record<string, unknown> } {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

/**
 * CSRF defence for cookie-authenticated mutations: browsers always send Origin on
 * cross-site POST/PUT/PATCH/DELETE, so a mismatching Origin is rejected.
 */
function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw ApiError.forbidden("Cross-site request rejected.");
    }
    const allowed = new Set([req.nextUrl.host, req.headers.get("host") ?? "", safeHost(env.appUrl)]);
    const forwardedHost = req.headers.get("x-forwarded-host");
    if (forwardedHost) allowed.add(forwardedHost);
    if (!allowed.has(originHost)) throw ApiError.forbidden("Cross-site request rejected.");
  } else if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw ApiError.forbidden("Cross-site request rejected.");
  }
}

function safeHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

type RouteContext<P> = { params: Promise<P> };

/** Wraps a route handler with DB connection, CSRF check and uniform error responses. */
export function route<P = Record<string, string>>(
  fn: (req: NextRequest, ctx: RouteContext<P>) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: RouteContext<P>): Promise<Response> => {
    // API responses are always request-time; never prerendered with Cache Components.
    // Awaited outside the try so the framework's prerender abort is not treated as an app error.
    await connection();
    try {
      if (MUTATING.has(req.method)) assertSameOrigin(req);
      await connectDb();
      return await fn(req, ctx);
    } catch (error) {
      return errorResponse(error, req);
    }
  };
}

export async function readJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_JSON_BYTES) throw new ApiError(413, "payload_too_large", "Request body is too large.");
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_JSON_BYTES) throw new ApiError(413, "payload_too_large", "Request body is too large.");
    body = text ? JSON.parse(text) : {};
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest("Malformed JSON body.");
  }
  return schema.parse(body);
}

export function readQuery<T>(req: NextRequest, schema: ZodType<T>): T {
  const raw: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  return schema.parse(raw);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw ApiError.unauthenticated();
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) throw ApiError.forbidden();
  return user;
}

export async function requireAnyPermission(permissions: Permission[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!permissions.some((p) => hasPermission(user.role, p))) throw ApiError.forbidden();
  return user;
}

export function assertObjectId(id: string, label = "Resource"): void {
  if (!mongoose.isValidObjectId(id) || !/^[a-f\d]{24}$/i.test(id)) throw ApiError.notFound(`${label} not found.`);
}
