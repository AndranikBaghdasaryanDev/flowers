import "server-only";
import { after } from "next/server";
import { connectDb } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { Notification } from "@/lib/models/system";
import type { Id } from "@/lib/models/_util";
import { renderEmailHtml, sendEmail } from "@/lib/services/email";
import { loadSettings } from "@/lib/services/settings";
import { formatMoney, type CurrencyCode } from "@/lib/domain/money";
import { orderStatusLabel, type FulfillmentType, type OrderStatus } from "@/lib/domain/orders";
import { formatDateKey } from "@/lib/domain/time";

/**
 * Notification architecture: every notification is persisted with an honest
 * status (sent / failed / skipped). Channels: email (SMTP), in_app (customer account).
 * SMS / messaging providers can be added as further channels without changing callers.
 */

/** Runs work after the HTTP response is sent; falls back to a detached promise outside a request. */
export function runAfterResponse(task: () => Promise<void>): void {
  const safe = () => task().catch((error) => logger.error("background task failed", { error }));
  try {
    after(safe);
  } catch {
    void safe();
  }
}

type OrderLike = {
  _id: Id;
  orderNumber: string;
  user?: Id | null;
  customer: { name: string; email: string };
  status: string;
  total: number;
  currency: string;
  deliveryDate: string;
  fulfillment: { kind: string; methodName: string };
  timeWindow?: { label?: string | null } | null;
};

async function record(
  data: {
    user?: Id | string | null;
    order?: Id | null;
    channel: "email" | "in_app" | "sms";
    recipient: string;
    template: string;
    subject: string;
    body: string;
  },
  send?: () => Promise<{ status: "sent" | "skipped" | "failed"; error?: string }>,
) {
  await connectDb();
  const doc = await Notification.create({ ...data, status: send ? "queued" : "sent", sentAt: send ? null : new Date() });
  if (send) {
    const result = await send();
    await Notification.updateOne(
      { _id: doc._id },
      { $set: { status: result.status, error: result.error ?? "", sentAt: result.status === "sent" ? new Date() : null } },
    );
  }
}

async function emailAndRecord(
  meta: { user?: Id | string | null; order?: Id | null; template: string },
  to: string,
  subject: string,
  paragraphs: string[],
  action?: { label: string; url: string },
) {
  const text = [...paragraphs, action ? `${action.label}: ${action.url}` : ""].filter(Boolean).join("\n\n");
  await record({ ...meta, channel: "email", recipient: to, subject, body: text }, () =>
    sendEmail({ to, subject, text, html: renderEmailHtml(subject, paragraphs, action) }),
  );
}

export async function notifyOrderPlaced(order: OrderLike, trackingToken: string) {
  const settings = await loadSettings();
  const total = formatMoney(order.total, order.currency as CurrencyCode);
  const when = formatDateKey(order.deliveryDate, { dateStyle: "full" });
  const trackUrl = `${env.appUrl}/orders/track?order=${encodeURIComponent(order.orderNumber)}&token=${encodeURIComponent(trackingToken)}`;
  const paragraphs = [
    `Dear ${order.customer.name},`,
    `Thank you for your order ${order.orderNumber}. We have received it and will confirm it shortly.`,
    `${order.fulfillment.kind === "pickup" ? "Pickup" : "Delivery"}: ${when}${order.timeWindow?.label ? `, ${order.timeWindow.label}` : ""} (${order.fulfillment.methodName}).`,
    `Order total: ${total}.`,
  ];
  await emailAndRecord(
    { user: order.user, order: order._id, template: "order_placed" },
    order.customer.email,
    `Your Floriani order ${order.orderNumber}`,
    paragraphs,
    { label: "Track your order", url: trackUrl },
  );
  if (order.user) {
    await record({
      user: order.user,
      order: order._id,
      channel: "in_app",
      recipient: String(order.user),
      template: "order_placed",
      subject: `Order ${order.orderNumber} received`,
      body: "We have received your order and will confirm it shortly.",
    });
  }
  if (settings.contact.email) {
    await emailAndRecord(
      { order: order._id, template: "staff_new_order" },
      settings.contact.email,
      `New order ${order.orderNumber} — ${total}`,
      [`A new order was placed by ${order.customer.name}.`, `${order.fulfillment.methodName}, ${when}.`],
      { label: "Open in admin", url: `${env.appUrl}/admin/orders/${String(order._id)}` },
    );
  }
}

const CUSTOMER_STATUS_COPY: Partial<Record<OrderStatus, (o: OrderLike) => string>> = {
  confirmed: () => "Your order has been confirmed. Our florists will prepare it for the date you selected.",
  ready: (o) =>
    o.fulfillment.kind === "pickup"
      ? "Your order is ready for pickup."
      : "Your order has been prepared and will be dispatched soon.",
  out_for_delivery: () => "Your order is on its way.",
  delivered: () => "Your order has been delivered. We hope it brings joy.",
  delivery_failed: () => "We could not complete the delivery. We will contact you to arrange another attempt.",
  cancelled: () => "Your order has been cancelled. If you have any questions, please contact us.",
  completed: (o) => (o.fulfillment.kind === "pickup" ? "Thank you for collecting your order." : "Your order is complete. Thank you for choosing Floriani."),
};

export async function notifyOrderStatus(order: OrderLike, status: OrderStatus, customerMessage?: string) {
  const copy = CUSTOMER_STATUS_COPY[status];
  if (!copy) return;
  const label = orderStatusLabel(status, order.fulfillment.kind as FulfillmentType);
  const paragraphs = [`Dear ${order.customer.name},`, copy(order)];
  if (customerMessage) paragraphs.push(customerMessage);
  const subject = `Order ${order.orderNumber}: ${label}`;
  const url = order.user
    ? `${env.appUrl}/account/orders/${String(order._id)}`
    : `${env.appUrl}/orders/track?order=${encodeURIComponent(order.orderNumber)}`;
  await emailAndRecord({ user: order.user, order: order._id, template: `order_${status}` }, order.customer.email, subject, paragraphs, {
    label: "View your order",
    url,
  });
  if (order.user) {
    await record({
      user: order.user,
      order: order._id,
      channel: "in_app",
      recipient: String(order.user),
      template: `order_${status}`,
      subject,
      body: [copy(order), customerMessage].filter(Boolean).join(" "),
    });
  }
}

export async function notifyCustomerMessage(order: OrderLike, message: string) {
  const subject = `A message about your order ${order.orderNumber}`;
  await emailAndRecord({ user: order.user, order: order._id, template: "order_message" }, order.customer.email, subject, [
    `Dear ${order.customer.name},`,
    message,
  ]);
  if (order.user) {
    await record({
      user: order.user,
      order: order._id,
      channel: "in_app",
      recipient: String(order.user),
      template: "order_message",
      subject,
      body: message,
    });
  }
}

export async function sendPasswordResetEmail(user: { _id: Id; email: string; name: string }, token: string) {
  const url = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await emailAndRecord(
    { user: user._id, template: "password_reset" },
    user.email,
    "Reset your Floriani password",
    [`Hello ${user.name},`, "We received a request to reset your password. This link is valid for 1 hour and can be used once.", "If you did not request this, you can ignore this email."],
    { label: "Choose a new password", url },
  );
}

export async function sendVerificationEmail(user: { _id: Id; email: string; name: string }, token: string) {
  const url = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  await emailAndRecord(
    { user: user._id, template: "email_verify" },
    user.email,
    "Confirm your email address",
    [`Hello ${user.name},`, "Please confirm your email address to finish setting up your Floriani account. This link is valid for 48 hours."],
    { label: "Confirm email", url },
  );
}
