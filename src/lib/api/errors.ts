import type { Translator } from "@/i18n/translate";
import { INTL_TAG } from "@/i18n/config";
import { formatMoney, type CurrencyCode } from "@/lib/domain/money";

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

/* ------------------------------ Translatable text ------------------------------ */

/** An amount rendered with the reader's number conventions when the message is translated. */
export type MoneyVar = { money: number; currency: CurrencyCode };

export type MsgVars = Record<string, string | number | MoneyVar | Msg>;

/**
 * A message that is translated at the edge (route handler or email), not where it is raised:
 * a dictionary key (normally under `server.`) plus interpolation values. A var may itself be a
 * message (e.g. a status label) or an amount of money.
 */
export type Msg = { key: string; vars?: MsgVars };

/** A dictionary key, a `Msg`, or (rarely) literal text that is passed through unchanged. */
export type Text = string | Msg;

export const msg = (key: string, vars?: MsgVars): Msg => (vars ? { key, vars } : { key });

/** Anything that can translate a runtime key — the request translator or an email translator. */
export type TextTranslator = Pick<Translator<unknown>, "dynamic" | "locale">;

/** Renders a message; unknown keys and literal strings fall back to the text itself. */
export function renderText(t: TextTranslator, text: Text): string {
  const m = typeof text === "string" ? { key: text } : text;
  const vars: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(m.vars ?? {})) {
    if (typeof value !== "object") vars[name] = value;
    else if ("money" in value) vars[name] = formatMoney(value.money, value.currency, INTL_TAG[t.locale]);
    else vars[name] = renderText(t, value);
  }
  return t.dynamic(m.key, vars, typeof text === "string" ? text : m.key);
}

/** Field errors as sent to clients (already translated). */
export type FieldErrors = Record<string, string>;
/** Field errors as raised by server code (keys or messages, translated in the response). */
export type FieldMessages = Record<string, Text>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly text: Text;
  readonly fields?: FieldMessages;
  readonly meta?: Record<string, unknown>;

  constructor(status: number, code: ApiErrorCode, message: Text, fields?: FieldMessages, meta?: Record<string, unknown>) {
    super(typeof message === "string" ? message : message.key);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.text = message;
    this.fields = fields;
    this.meta = meta;
  }

  static badRequest(message: Text, fields?: FieldMessages) {
    return new ApiError(400, "bad_request", message, fields);
  }
  static validation(message: Text, fields?: FieldMessages) {
    return new ApiError(422, "validation_error", message, fields);
  }
  static unauthenticated(message: Text = "server.errors.unauthenticated") {
    return new ApiError(401, "unauthenticated", message);
  }
  static forbidden(message: Text = "server.errors.forbidden") {
    return new ApiError(403, "forbidden", message);
  }
  static notFound(message: Text = "server.errors.notFound") {
    return new ApiError(404, "not_found", message);
  }
  static conflict(message: Text, meta?: Record<string, unknown>) {
    return new ApiError(409, "conflict", message, undefined, meta);
  }
  static rateLimited(retryAfterSeconds: number) {
    return new ApiError(429, "rate_limited", "server.errors.rateLimited", undefined, {
      retryAfter: retryAfterSeconds,
    });
  }
}

/** Entities whose "not found" message has its own wording. */
export type NotFoundEntity =
  | "address"
  | "category"
  | "courier"
  | "customer"
  | "deliveryMethod"
  | "galleryItem"
  | "order"
  | "product"
  | "review"
  | "staffMember";

export const notFound = (entity: NotFoundEntity) => ApiError.notFound(`server.notFound.${entity}`);

export function isDuplicateKeyError(error: unknown): error is { code: number; keyPattern?: Record<string, unknown> } {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}
