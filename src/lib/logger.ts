/**
 * Minimal structured logger. Emits one JSON line per event so logs are
 * searchable on any hosting platform. Never pass secrets or full card/password data.
 */
type Level = "debug" | "info" | "warn" | "error";

function serialiseError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack?.split("\n").slice(0, 6).join("\n") };
  }
  return error;
}

function log(level: Level, message: string, meta?: Record<string, unknown>) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const entry: Record<string, unknown> = { level, message, time: new Date().toISOString() };
  if (meta) {
    for (const [key, value] of Object.entries(meta)) entry[key] = key === "error" ? serialiseError(value) : value;
  }
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};
