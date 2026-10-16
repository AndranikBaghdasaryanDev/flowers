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

export async function api<T>(url: string, opts: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? (opts.body || opts.form ? "POST" : "GET"),
      headers: opts.form ? undefined : opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      signal: opts.signal,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiClientError(0, "network_error", "We could not reach the server. Check your connection and try again.");
  }
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    const err = (payload as { error?: { code?: string; message?: string; fields?: Record<string, string>; meta?: Record<string, unknown> } } | null)?.error;
    throw new ApiClientError(res.status, err?.code ?? "error", err?.message ?? "Something went wrong. Please try again.", err?.fields, err?.meta);
  }
  return (payload as { data: T }).data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
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
