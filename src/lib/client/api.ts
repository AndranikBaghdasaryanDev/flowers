"use client";

/** Typed fetch wrapper for the JSON API (`{ data }` / `{ error }` envelope). */
export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;
  readonly meta: Record<string, unknown>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>, meta?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields ?? {};
    this.meta = meta ?? {};
  }
}

type Options = { method?: string; body?: unknown; signal?: AbortSignal; form?: FormData };

/** Fallback messages for failures that happen before the server can answer (no translator here). */
const FALLBACK = {
  hy: {
    network: "Չհաջողվեց կապ հաստատել սերվերի հետ։ Ստուգեք ինտերնետ կապը և փորձեք կրկին։",
    generic: "Ինչ-որ բան սխալ գնաց։ Խնդրում ենք փորձել կրկին։",
  },
  en: { network: "We could not reach the server. Check your connection and try again.", generic: "Something went wrong. Please try again." },
  ru: { network: "Не удалось связаться с сервером. Проверьте подключение и попробуйте ещё раз.", generic: "Что-то пошло не так. Пожалуйста, попробуйте ещё раз." },
} as const;

function clientLocale(): keyof typeof FALLBACK {
  if (typeof window === "undefined") return "hy";
  const fromPath = /^\/(hy|en|ru)(?=\/|$)/.exec(window.location.pathname)?.[1];
  const fromCookie = /(?:^|; )ff_locale=(hy|en|ru)/.exec(document.cookie)?.[1];
  return (fromPath ?? fromCookie ?? "hy") as keyof typeof FALLBACK;
}

/** Storefront URLs carry the language (/hy/…); the admin relies on the language cookie instead. */
function currentLocaleHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const m = /^\/(hy|en|ru)(?=\/|$)/.exec(window.location.pathname);
  return m ? { "X-Locale": m[1] } : {};
}

export async function api<T>(url: string, opts: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? (opts.body || opts.form ? "POST" : "GET"),
      headers: {
        ...currentLocaleHeader(),
        ...(!opts.form && opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      signal: opts.signal,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiClientError(0, "network_error", FALLBACK[clientLocale()].network);
  }
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    const err = (payload as { error?: { code?: string; message?: string; fields?: Record<string, string>; meta?: Record<string, unknown> } } | null)?.error;
    throw new ApiClientError(res.status, err?.code ?? "error", err?.message ?? FALLBACK[clientLocale()].generic, err?.fields, err?.meta);
  }
  return (payload as { data: T }).data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return FALLBACK[clientLocale()].generic;
}

export function fieldErrors(error: unknown): Record<string, string> {
  return error instanceof ApiClientError ? error.fields : {};
}

/** A random key used to make checkout submissions idempotent. */
export function newIdempotencyKey(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
