import "server-only";
import { NextResponse, connection, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import mongoose from "mongoose";
import { connectDb, DatabaseUnavailableError } from "@/lib/db";
import { env } from "@/lib/env";
import {
  ApiError,
  isDuplicateKeyError,
  notFound,
  renderText,
  type FieldErrors,
  type NotFoundEntity,
  type TextTranslator,
} from "@/lib/api/errors";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import type { Permission } from "@/lib/domain/roles";
import { hasPermission } from "@/lib/domain/roles";
import { logger } from "@/lib/logger";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { getRequestLocale, translatorFor } from "@/i18n/server";

export { isDuplicateKeyError };

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_JSON_BYTES = 1024 * 1024;

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

/** Translator for the language of the current API request (X-Locale header, cookie, Accept-Language). */
export async function requestTranslator() {
  let locale = DEFAULT_LOCALE;
  try {
    locale = await getRequestLocale();
  } catch {
    // Outside a request scope: fall back to the default language.
  }
  return translatorFor(locale);
}

/**
 * Translates a Zod issue. Schema messages are dictionary keys (`server.validation.*`);
 * Zod's built-in English messages are replaced by a generic message for the issue type.
 */
function zodIssueText(t: TextTranslator, issue: ZodError["issues"][number]): string {
  const vars: Record<string, string | number> = {};
  if ("maximum" in issue) vars.max = Number(issue.maximum);
  if ("minimum" in issue) vars.min = Number(issue.minimum);
  if (issue.message.startsWith("server.")) return renderText(t, { key: issue.message, vars });
  const origin = "origin" in issue ? issue.origin : undefined;
  let key = "server.validation.invalid";
  if (issue.code === "too_big") key = origin === "string" ? "server.validation.tooLong" : origin === "array" ? "server.validation.tooMany" : "server.validation.tooBig";
  else if (issue.code === "too_small") key = origin === "string" ? "server.validation.tooShort" : origin === "array" ? "server.validation.tooFew" : "server.validation.tooSmall";
  else if (issue.code === "invalid_type" && issue.input === undefined) key = "server.validation.required";
  else if (issue.code === "invalid_value") key = "server.validation.chooseOption";
  else if (issue.code === "invalid_format") key = "server.validation.invalidFormat";
  return renderText(t, { key, vars });
}

export function zodFieldErrors(error: ZodError, t: TextTranslator): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = zodIssueText(t, issue);
  }
  return fields;
}

function errorBody(code: string, message: string, extra?: { fields?: FieldErrors; meta?: Record<string, unknown> }) {
  return { error: { code, message, ...extra } };
}

async function errorResponse(error: unknown, req: NextRequest): Promise<NextResponse> {
  const t = await requestTranslator();
  if (error instanceof ApiError) {
    const headers: Record<string, string> = {};
    if (error.code === "rate_limited" && typeof error.meta?.retryAfter === "number") {
      headers["Retry-After"] = String(error.meta.retryAfter);
    }
    const fields = error.fields
      ? Object.fromEntries(Object.entries(error.fields).map(([k, v]) => [k, renderText(t, v)]))
      : undefined;
    return NextResponse.json(errorBody(error.code, renderText(t, error.text), { fields, meta: error.meta }), {
      status: error.status,
      headers,
    });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      errorBody("validation_error", t("server.errors.checkFields"), { fields: zodFieldErrors(error, t) }),
      { status: 422 },
    );
  }
  if (error instanceof DatabaseUnavailableError || error instanceof mongoose.Error.MongooseServerSelectionError) {
    logger.error("database unavailable", { path: req.nextUrl.pathname, error });
    return NextResponse.json(errorBody("service_unavailable", t("server.errors.unavailable")), { status: 503 });
  }
  if (isDuplicateKeyError(error)) {
    return NextResponse.json(errorBody("conflict", t("server.errors.duplicate")), { status: 409 });
  }
  if (error instanceof mongoose.Error.ValidationError) {
    const fields: FieldErrors = {};
    for (const key of Object.keys(error.errors)) fields[key] = t("server.validation.invalid");
    return NextResponse.json(errorBody("validation_error", t("server.errors.invalidData"), { fields }), { status: 422 });
  }
  if (error instanceof mongoose.Error.CastError) {
    return NextResponse.json(errorBody("not_found", t("server.errors.notFound")), { status: 404 });
  }
  logger.error("unhandled API error", { path: req.nextUrl.pathname, method: req.method, error });
  return NextResponse.json(errorBody("internal_error", t("server.errors.internal")), { status: 500 });
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
      throw ApiError.forbidden("server.errors.crossSite");
    }
    const allowed = new Set([req.nextUrl.host, req.headers.get("host") ?? "", safeHost(env.appUrl)]);
    const forwardedHost = req.headers.get("x-forwarded-host");
    if (forwardedHost) allowed.add(forwardedHost);
    if (!allowed.has(originHost)) throw ApiError.forbidden("server.errors.crossSite");
  } else if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw ApiError.forbidden("server.errors.crossSite");
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
  if (length > MAX_JSON_BYTES) throw new ApiError(413, "payload_too_large", "server.errors.payloadTooLarge");
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_JSON_BYTES) throw new ApiError(413, "payload_too_large", "server.errors.payloadTooLarge");
    body = text ? JSON.parse(text) : {};
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest("server.errors.malformedJson");
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

export function assertObjectId(id: string, entity?: NotFoundEntity): void {
  if (!mongoose.isValidObjectId(id) || !/^[a-f\d]{24}$/i.test(id)) throw entity ? notFound(entity) : ApiError.notFound();
}
