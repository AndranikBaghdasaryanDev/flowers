import "server-only";
import { after } from "next/server";
import { connectDb } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { Notification } from "@/lib/models/system";
import type { Id } from "@/lib/models/_util";
import { renderEmailHtml, sendEmail } from "@/lib/services/email";
import { loadSettings } from "@/lib/services/settings";
import type { CurrencyCode } from "@/lib/domain/money";
import type { FulfillmentType, OrderStatus } from "@/lib/domain/orders";
import { DEFAULT_LOCALE, INTL_TAG, isLocale, localizePath, type Locale } from "@/i18n/config";
import { createFormatter } from "@/i18n/format";
import { createTranslator, type Translator } from "@/i18n/translate";
import { statusLabel } from "@/i18n/labels";
import type { Messages } from "@/i18n/messages";

/**
 * Notification architecture: every notification is persisted with an honest
 * status (sent / failed / skipped). Channels: email (SMTP), in_app (customer account).
 * SMS / messaging providers can be added as further channels without changing callers.
 *
 * Customer messages are written in the language of the order (or of the account);
 * staff notifications use the store's default language.
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

type EmailT = Translator<Messages>;

/**
 * Translator for an email. The dictionaries are loaded lazily so the order and auth
 * services stay importable where no email is ever sent (tests, scripts).
 */
async function emailTranslator(locale: unknown): Promise<EmailT> {
  const lang: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const { messages } = await import("@/i18n/messages");
  return createTranslator<Messages>(lang, messages[lang], messages.en);
}

/** Absolute storefront URL in the reader's language. */
const storeUrl = (path: string, locale: Locale) => `${env.appUrl}${localizePath(path, locale)}`;

type OrderLike = {
  _id: Id;
  orderNumber: string;
  user?: Id | null;
  locale?: string | null;
  customer: { name: string; email: string };
  status: string;
  total: number;
  currency: string;
  deliveryDate: string;
  fulfillment: { kind: string; methodName: string };
  timeWindow?: { label?: string | null } | null;
};

type UserLike = { _id: Id; email: string; name: string; locale?: string | null };

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
  locale: Locale,
  to: string,
  subject: string,
  paragraphs: string[],
  action?: { label: string; url: string },
) {
  const text = [...paragraphs, action ? `${action.label}: ${action.url}` : ""].filter(Boolean).join("\n\n");
  await record({ ...meta, channel: "email", recipient: to, subject, body: text }, () =>
    sendEmail({ to, subject, text, html: renderEmailHtml(subject, paragraphs, action, INTL_TAG[locale]) }),
  );
}

/** "Delivery: Friday, 16 October 2026, 10:00 – 13:00 (Courier delivery)." in the reader's language. */
function fulfilmentLine(t: EmailT, order: OrderLike, when: string): string {
  const pickup = order.fulfillment.kind === "pickup";
  const vars = { when, window: order.timeWindow?.label ?? "", method: order.fulfillment.methodName };
  if (order.timeWindow?.label) return pickup ? t("email.orderPlaced.pickupLineWindow", vars) : t("email.orderPlaced.deliveryLineWindow", vars);
  return pickup ? t("email.orderPlaced.pickupLine", vars) : t("email.orderPlaced.deliveryLine", vars);
}

export async function notifyOrderPlaced(order: OrderLike, trackingToken: string) {
  const settings = await loadSettings();
  const t = await emailTranslator(order.locale);
  const f = createFormatter(t.locale);
  const total = f.money(order.total, order.currency as CurrencyCode);
  const when = f.dateKey(order.deliveryDate, { dateStyle: "full" });
  const trackUrl = storeUrl(
    `/orders/track?order=${encodeURIComponent(order.orderNumber)}&token=${encodeURIComponent(trackingToken)}`,
    t.locale,
  );
  const paragraphs = [
    t("email.greeting", { name: order.customer.name }),
    t("email.orderPlaced.thanks", { orderNumber: order.orderNumber }),
    fulfilmentLine(t, order, when),
    t("email.orderPlaced.total", { total }),
  ];
  await emailAndRecord(
    { user: order.user, order: order._id, template: "order_placed" },
    t.locale,
    order.customer.email,
    t("email.orderPlaced.subject", { orderNumber: order.orderNumber }),
    paragraphs,
    { label: t("email.orderPlaced.action"), url: trackUrl },
  );
  if (order.user) {
    await record({
      user: order.user,
      order: order._id,
      channel: "in_app",
      recipient: String(order.user),
      template: "order_placed",
      subject: t("email.orderPlaced.inAppSubject", { orderNumber: order.orderNumber }),
      body: t("email.orderPlaced.inAppBody"),
    });
  }
  if (settings.contact.email) {
    const st = await emailTranslator(DEFAULT_LOCALE);
    const sf = createFormatter(st.locale);
    const staffTotal = sf.money(order.total, order.currency as CurrencyCode);
    await emailAndRecord(
      { order: order._id, template: "staff_new_order" },
      st.locale,
      settings.contact.email,
      st("email.staffNewOrder.subject", { orderNumber: order.orderNumber, total: staffTotal }),
      [
        st("email.staffNewOrder.body", { name: order.customer.name }),
        st("email.staffNewOrder.when", { method: order.fulfillment.methodName, when: sf.dateKey(order.deliveryDate, { dateStyle: "full" }) }),
      ],
      { label: st("email.staffNewOrder.action"), url: `${env.appUrl}/admin/orders/${String(order._id)}` },
    );
  }
}

/** Customer-facing wording per status (null = no message for that status). */
function statusCopy(t: EmailT, status: OrderStatus, kind: FulfillmentType): string | null {
  switch (status) {
    case "confirmed":
      return t("email.status.confirmed");
    case "ready":
      return kind === "pickup" ? t("email.status.readyPickup") : t("email.status.readyDispatch");
    case "out_for_delivery":
      return t("email.status.outForDelivery");
    case "delivered":
      return t("email.status.delivered");
    case "delivery_failed":
      return t("email.status.deliveryFailed");
    case "cancelled":
      return t("email.status.cancelled");
    case "completed":
      return kind === "pickup" ? t("email.status.completedPickup") : t("email.status.completed");
    default:
      return null;
  }
}

export async function notifyOrderStatus(order: OrderLike, status: OrderStatus, customerMessage?: string) {
  const t = await emailTranslator(order.locale);
  const kind = order.fulfillment.kind as FulfillmentType;
  const copy = statusCopy(t, status, kind);
  if (!copy) return;
  const paragraphs = [t("email.greeting", { name: order.customer.name }), copy];
  if (customerMessage) paragraphs.push(customerMessage);
  const subject = t("email.status.subject", { orderNumber: order.orderNumber, status: statusLabel(t, status, kind) });
  const url = order.user
    ? storeUrl(`/account/orders/${String(order._id)}`, t.locale)
    : storeUrl(`/orders/track?order=${encodeURIComponent(order.orderNumber)}`, t.locale);
  await emailAndRecord(
    { user: order.user, order: order._id, template: `order_${status}` },
    t.locale,
    order.customer.email,
    subject,
    paragraphs,
    { label: t("email.status.action"), url },
  );
  if (order.user) {
    await record({
      user: order.user,
      order: order._id,
      channel: "in_app",
      recipient: String(order.user),
      template: `order_${status}`,
      subject,
      body: [copy, customerMessage].filter(Boolean).join(" "),
    });
  }
}

export async function notifyCustomerMessage(order: OrderLike, message: string) {
  const t = await emailTranslator(order.locale);
  const subject = t("email.message.subject", { orderNumber: order.orderNumber });
  await emailAndRecord({ user: order.user, order: order._id, template: "order_message" }, t.locale, order.customer.email, subject, [
    t("email.greeting", { name: order.customer.name }),
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

export async function sendPasswordResetEmail(user: UserLike, token: string) {
  const t = await emailTranslator(user.locale);
  const url = storeUrl(`/reset-password?token=${encodeURIComponent(token)}`, t.locale);
  await emailAndRecord(
    { user: user._id, template: "password_reset" },
    t.locale,
    user.email,
    t("email.passwordReset.subject"),
    [t("email.hello", { name: user.name }), t("email.passwordReset.body"), t("email.passwordReset.ignore")],
    { label: t("email.passwordReset.action"), url },
  );
}

export async function sendVerificationEmail(user: UserLike, token: string) {
  const t = await emailTranslator(user.locale);
  const url = storeUrl(`/verify-email?token=${encodeURIComponent(token)}`, t.locale);
  await emailAndRecord(
    { user: user._id, template: "email_verify" },
    t.locale,
    user.email,
    t("email.verify.subject"),
    [t("email.hello", { name: user.name }), t("email.verify.body")],
    { label: t("email.verify.action"), url },
  );
}
