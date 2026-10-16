import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** A URL-safe random token (256 bits). Only its SHA-256 hash is ever stored. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
