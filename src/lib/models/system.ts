import mongoose from "mongoose";
import { defineSchema, getModel, ObjectId, type Id } from "./_util";

const auditLogSchema = defineSchema(
  {
    actor: { type: ObjectId, ref: "User", default: null, index: true },
    actorName: { type: String, default: "System" },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true },
    entityId: { type: String, default: "" },
    summary: { type: String, required: true, maxlength: 500 },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
export interface AuditLogDoc {
  _id: Id;
  actor: Id | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  meta: unknown;
  ip: string;
  createdAt: Date;
}
export const AuditLog = getModel<AuditLogDoc>("AuditLog", auditLogSchema);

const notificationSchema = defineSchema(
  {
    user: { type: ObjectId, ref: "User", default: null, index: true },
    order: { type: ObjectId, ref: "Order", default: null, index: true },
    channel: { type: String, enum: ["email", "sms", "in_app"], required: true },
    recipient: { type: String, default: "" },
    template: { type: String, required: true },
    subject: { type: String, default: "" },
    body: { type: String, default: "" },
    /** queued → sent | failed; skipped = no provider configured (never reported as delivered). */
    status: { type: String, enum: ["queued", "sent", "failed", "skipped"], default: "queued" },
    error: { type: String, default: "" },
    sentAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);
notificationSchema.index({ createdAt: -1 });
export interface NotificationDoc {
  _id: Id;
  user: Id | null;
  order: Id | null;
  channel: "email" | "sms" | "in_app";
  recipient: string;
  template: string;
  subject: string;
  body: string;
  status: "queued" | "sent" | "failed" | "skipped";
  error: string;
  sentAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
}
export const Notification = getModel<NotificationDoc>("Notification", notificationSchema);

const rateLimitSchema = defineSchema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  resetAt: { type: Date, required: true },
});
rateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });
export const RateLimit = getModel<{ key: string; count: number; resetAt: Date }>("RateLimit", rateLimitSchema);
