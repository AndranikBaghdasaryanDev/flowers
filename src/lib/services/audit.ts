import "server-only";
import type mongoose from "mongoose";
import { AuditLog } from "@/lib/models/system";
import { logger } from "@/lib/logger";
import type { SessionUser } from "@/lib/auth/session";

export type AuditEntry = {
  actor: Pick<SessionUser, "id" | "name"> | null;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  meta?: Record<string, unknown>;
  ip?: string;
};

/** Records an administrative action. Failures are logged but never break the operation. */
export async function audit(entry: AuditEntry, session?: mongoose.ClientSession): Promise<void> {
  try {
    await AuditLog.create(
      [
        {
          actor: entry.actor?.id ?? null,
          actorName: entry.actor?.name ?? "System",
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? "",
          summary: entry.summary.slice(0, 500),
          meta: entry.meta ?? null,
          ip: entry.ip ?? "",
        },
      ],
      session ? { session } : undefined,
    );
  } catch (error) {
    if (session) throw error;
    logger.error("audit log write failed", { error, action: entry.action });
  }
}
