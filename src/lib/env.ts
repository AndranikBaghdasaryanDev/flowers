import "server-only";

/**
 * Centralised, validated access to server environment variables.
 * Values are read lazily so `next build` can run without a database.
 */

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

function required(name: string): string {
  const value = read(name);
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example and docs/DEPLOYMENT.md.`,
    );
  }
  return value;
}

export const env = {
  get mongodbUri() {
    return required("MONGODB_URI");
  },
  get mongodbDbName() {
    return read("MONGODB_DB") ?? "floriani";
  },
  get appUrl() {
    return (read("APP_URL") ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get smtp() {
    const host = read("SMTP_HOST");
    const from = read("EMAIL_FROM");
    if (!host || !from) return null;
    return {
      host,
      port: Number(read("SMTP_PORT") ?? 587),
      secure: read("SMTP_SECURE") === "true",
      user: read("SMTP_USER"),
      pass: read("SMTP_PASS"),
      from,
    };
  },
  get maxUploadBytes() {
    return Number(read("MAX_UPLOAD_MB") ?? 8) * 1024 * 1024;
  },
};
