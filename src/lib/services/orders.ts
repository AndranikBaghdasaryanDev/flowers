import "server-only";
import mongoose from "mongoose";
import { connectDb, withTransaction } from "@/lib/db";
import { Counter, Order, type OrderDoc } from "@/lib/models/order";
import { Product } from "@/lib/models/catalog";
import { Courier, DeliveryMethod } from "@/lib/models/delivery";
import { User } from "@/lib/models/user";
import { Notification } from "@/lib/models/system";
import { Review } from "@/lib/models/content";
import { ApiError, isDuplicateKeyError, msg, notFound, type TextTranslator } from "@/lib/api/errors";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import type { SessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/domain/roles";
import {
  CUSTOMER_CANCELLABLE,
  MOTOR_VEHICLES,
  VEHICLE_LABELS,
  checkPaymentTransition,
  checkTransition,
  orderStatusLabel,
  permissionForTransition,
  type FulfillmentType,
  type OrderStatus,
  type PaymentStatus,
  type VehicleType,
} from "@/lib/domain/orders";
import { toDateKey, zonedDayRange, addDaysToKey } from "@/lib/domain/time";
import type { CurrencyCode } from "@/lib/domain/money";
import type { CheckoutInput } from "@/lib/validation";
import type { z } from "zod";
import type { deliveryAssignSchema, orderListQuerySchema, paymentChangeSchema, statusChangeSchema } from "@/lib/validation";
import { loadSettings, type StoreSettings } from "@/lib/services/settings";
import {
  checkSchedule,
  findZone,
  getActiveDeliveryMethod,
  isMethodCity,
  isPaymentMethodEnabled,
  paymentMethodFor,
} from "@/lib/services/delivery";
import { priceCart } from "@/lib/services/pricing";
import { mediaInfoMap } from "@/lib/services/media";
import { invalidateBestsellers } from "@/lib/services/catalog";
import { audit } from "@/lib/services/audit";
import { notifyCustomerMessage, notifyOrderPlaced, notifyOrderStatus, runAfterResponse } from "@/lib/services/notifications";
import type {
  CustomerOrderDTO,
  OrderEventDTO,
  OrderListItemDTO,
  Paginated,
  StaffOrderDTO,
} from "@/lib/types";

const ORDER_PAGE_SIZE = 20;

/* ------------------------------ Order numbers ----------------------------- */

async function nextOrderNumber(session: mongoose.ClientSession): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { _id: "order" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", session },
  ).lean();
  return `FF-${10000 + (counter?.seq ?? 1)}`;
}

/* ------------------------------ Create order ------------------------------ */

export type CreateOrderResult = { order: CustomerOrderDTO; trackingToken: string; replayed: boolean };

export type CreateOrderOptions = {
  /** Language of the storefront the order is placed from (stored on the order; used for emails). */
  locale?: Locale;
  /** Translator for messages embedded in the response (e.g. the refreshed quote on a conflict). */
  t?: TextTranslator;
};

export async function createOrder(input: CheckoutInput, user: SessionUser | null, opts: CreateOrderOptions = {}): Promise<CreateOrderResult> {
  await connectDb();
  const settings = await loadSettings();

  if (!user && !settings.checkout.guestCheckout) {
    throw ApiError.unauthenticated("server.checkout.signInRequired");
  }

  const replay = await findReplay(input.idempotencyKey, user, input.customer.email);
  if (replay) return replay;

  const method = await getActiveDeliveryMethod(input.deliveryMethodId);
  if (!method) throw ApiError.validation("server.checkout.methodUnavailable", { deliveryMethodId: "server.checkout.chooseAvailableOption" });

  const expectedPayment = paymentMethodFor(method);
  if (input.paymentMethod !== expectedPayment || !isPaymentMethodEnabled(input.paymentMethod, settings)) {
    throw ApiError.validation("server.checkout.paymentUnavailable", {
      paymentMethod: "server.checkout.choosePayment",
    });
  }

  let address: OrderDoc["address"] = null;
  if (method.type === "delivery") {
    if (!input.address) throw ApiError.validation("server.checkout.enterAddress", { "address.street": "server.checkout.enterAddress" });
    if (method.city && !isMethodCity(method, input.address.city)) {
      const cityName = (await getActiveDeliveryMethod(method.id, opts.locale))?.city || method.city;
      throw ApiError.validation(msg("server.checkout.cityOnly", { city: cityName }), {
        "address.city": msg("server.checkout.cityOnlyField", { city: cityName }),
      });
    }
    // Areas and the city may be chosen in any language; the order stores the canonical (English) names.
    if (method.city) input.address.city = method.city;
    if (method.zones.length > 0) {
      const zone = findZone(method, input.address.zone);
      if (!zone) throw ApiError.validation("server.checkout.zoneNotCovered", { "address.zone": "server.checkout.chooseZone" });
      input.address.zone = zone.name;
    }
    address = { ...input.address };
  }
  // Pickup orders never store an address, even if one was submitted.

  const schedule = checkSchedule(method, input.deliveryDate, input.timeWindow, new Date(), settings.timeZone);
  if (!schedule.ok) throw ApiError.validation(schedule.reason, { [schedule.field]: schedule.reason });

  const token = generateToken();
  let created: OrderDoc;
  try {
    created = await withTransaction(async (session) => {
      const quote = await priceCart(input.items, settings, { method, zone: address?.zone ?? undefined, session, t: opts.t });
      const publicQuote = { ...quote, priced: undefined, notes: undefined };
      const problems = quote.priced.filter((l) => l.status !== "ok");
      if (problems.length > 0 || quote.itemCount === 0) {
        throw ApiError.conflict("server.checkout.cartChanged", {
          reason: "cart_changed",
          quote: publicQuote,
        });
      }
      if (quote.notes.issues.length > 0) throw ApiError.validation(quote.notes.issues[0]);
      if (quote.deliveryFee === null) {
        const note = quote.notes.delivery ?? msg("server.checkout.deliveryUnavailable");
        throw ApiError.validation(note, { "address.zone": note });
      }
      if (input.expectedTotal !== undefined && input.expectedTotal !== quote.total) {
        throw ApiError.conflict("server.checkout.pricesChanged", {
          reason: "total_changed",
          quote: publicQuote,
        });
      }

      for (const line of quote.priced) {
        const doc = line.doc!;
        if (doc.trackInventory) {
          const res = await Product.updateOne(
            { _id: doc._id, trackInventory: true, stockQuantity: { $gte: line.quantity } },
            { $inc: { stockQuantity: -line.quantity, unitsSold: line.quantity } },
            { session },
          );
          if (res.modifiedCount !== 1) {
            throw ApiError.conflict(msg("server.checkout.soldOut", { name: line.name }), {
              reason: "stock",
            });
          }
        } else {
          await Product.updateOne({ _id: doc._id }, { $inc: { unitsSold: line.quantity } }, { session });
        }
      }

      const orderNumber = await nextOrderNumber(session);
      const now = new Date();
      const [order] = await Order.create(
        [
          {
            orderNumber,
            idempotencyKey: input.idempotencyKey,
            accessTokenHashes: [hashToken(token)],
            user: user?.id ?? null,
            locale: opts.locale ?? DEFAULT_LOCALE,
            customer: { name: input.customer.name, email: input.customer.email, phone: input.customer.phone },
            recipient: { name: input.recipient?.name ?? "", phone: input.recipient?.phone ?? "" },
            fulfillment: { kind: method.type, method: method.id, methodName: method.name, requiresCourier: method.requiresCourier },
            address,
            deliveryDate: input.deliveryDate,
            timeWindow: schedule.window,
            items: quote.priced.map((l) => ({
              product: l.doc!._id,
              name: l.doc!.name,
              slug: l.doc!.slug,
              image: l.doc!.images[0]?.media ?? null,
              imageAlt: l.doc!.images[0]?.alt ?? l.doc!.name,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              lineTotal: l.lineTotal,
              stockDecremented: Boolean(l.doc!.trackInventory),
            })),
            currency: settings.currency,
            subtotal: quote.subtotal,
            deliveryFee: quote.deliveryFee,
            discountTotal: quote.discountTotal,
            total: quote.total,
            paymentMethod: input.paymentMethod,
            paymentStatus: "unpaid",
            status: "pending",
            giftMessage: input.giftMessage,
            customerComment: input.customerComment,
            history: [
              {
                type: "created",
                to: "pending",
                actor: user?.id ?? null,
                actorName: input.customer.name,
                actorType: "customer",
                at: now,
              },
            ],
          },
        ],
        { session },
      );
      if (user) {
        await User.updateOne({ _id: user.id }, { $set: { "cart.items": [], "cart.giftMessage": "", "cart.updatedAt": now } }, { session });
      }
      return order.toObject() as OrderDoc;
    });
  } catch (error) {
    if (isDuplicateKeyError(error) && error.keyPattern && "idempotencyKey" in error.keyPattern) {
      const again = await findReplay(input.idempotencyKey, user, input.customer.email);
      if (again) return again;
    }
    throw error;
  }

  invalidateBestsellers();
  runAfterResponse(() => notifyOrderPlaced(created, token));
  return { order: await toCustomerOrderDTO(created, settings), trackingToken: token, replayed: false };
}

/** Returns the already-created order for a repeated submission with the same idempotency key. */
async function findReplay(key: string, user: SessionUser | null, email: string): Promise<CreateOrderResult | null> {
  const existing = await Order.findOne({ idempotencyKey: key }).lean<OrderDoc>();
  if (!existing) return null;
  const sameOwner = user ? String(existing.user) === user.id : !existing.user && existing.customer.email === email.toLowerCase();
  if (!sameOwner) throw ApiError.conflict("server.checkout.sessionUsed");
  const token = generateToken();
  await Order.updateOne({ _id: existing._id }, { $push: { accessTokenHashes: { $each: [hashToken(token)], $slice: -5 } } });
  const settings = await loadSettings();
  return { order: await toCustomerOrderDTO(existing, settings), trackingToken: token, replayed: true };
}

/* ------------------------------ Serialisation ----------------------------- */

const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : null);

function eventDto(h: OrderDoc["history"][number], forCustomer: boolean): OrderEventDTO {
  return {
    id: String(h._id),
    type: h.type as OrderEventDTO["type"],
    from: h.from ?? null,
    to: h.to ?? null,
    actorName: forCustomer && h.actorType === "staff" ? "Floriani" : (h.actorName ?? "System"),
    actorType: (h.actorType ?? "system") as OrderEventDTO["actorType"],
    note: forCustomer ? undefined : (h.note ?? ""),
    message: h.message ?? "",
    at: new Date(h.at ?? Date.now()).toISOString(),
  };
}

async function itemsDto(order: OrderDoc) {
  const media = await mediaInfoMap(order.items.map((i) => i.image));
  return order.items.map((i) => {
    const info = i.image ? media.get(String(i.image)) : undefined;
    return {
      id: String(i._id),
      productId: String(i.product),
      name: i.name,
      slug: i.slug,
      image: info ? { src: info.url, alt: i.imageAlt || i.name, width: info.width, height: info.height } : null,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    };
  });
}

function baseDto(order: OrderDoc) {
  const kind = order.fulfillment.kind as FulfillmentType;
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    createdAt: new Date(order.createdAt).toISOString(),
    status: order.status as OrderStatus,
    statusLabel: orderStatusLabel(order.status as OrderStatus, kind),
    paymentStatus: order.paymentStatus as PaymentStatus,
    paymentMethod: order.paymentMethod as CustomerOrderDTO["paymentMethod"],
    fulfillment: { type: kind, methodName: order.fulfillment.methodName },
    address: order.address
      ? {
          city: order.address.city ?? "",
          zone: order.address.zone ?? "",
          street: order.address.street ?? "",
          building: order.address.building ?? "",
          apartment: order.address.apartment ?? "",
          entrance: order.address.entrance ?? "",
          floor: order.address.floor ?? "",
          notes: order.address.notes ?? "",
        }
      : null,
    deliveryDate: order.deliveryDate,
    timeWindow: order.timeWindow?.label
      ? { label: order.timeWindow.label, start: order.timeWindow.start ?? "", end: order.timeWindow.end ?? "" }
      : null,
    customer: { name: order.customer.name, email: order.customer.email, phone: order.customer.phone },
    recipient: { name: order.recipient?.name ?? "", phone: order.recipient?.phone ?? "" },
    currency: order.currency as CurrencyCode,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    discountTotal: order.discountTotal ?? 0,
    total: order.total,
    giftMessage: order.giftMessage ?? "",
    customerComment: order.customerComment ?? "",
    dispatchedAt: iso(order.delivery?.dispatchedAt),
    deliveredAt: iso(order.delivery?.deliveredAt),
  };
}

export async function toCustomerOrderDTO(order: OrderDoc, settings: StoreSettings, opts: { userId?: string } = {}): Promise<CustomerOrderDTO> {
  const status = order.status as OrderStatus;
  const showCourier = ["out_for_delivery", "delivered", "completed"].includes(status) && order.delivery?.courierName;
  let pickupAddress = "";
  if (order.fulfillment.kind === "pickup") {
    const m = await DeliveryMethod.findById(order.fulfillment.method).select("pickupAddress").lean<{ pickupAddress?: string }>();
    pickupAddress = m?.pickupAddress || settings.contact.address;
  }
  let reviewableProductIds: string[] = [];
  if (opts.userId && ["delivered", "completed"].includes(status)) {
    const reviewed = await Review.find({ user: opts.userId, product: { $in: order.items.map((i) => i.product) } }).select("product").lean();
    const done = new Set(reviewed.map((r) => String(r.product)));
    reviewableProductIds = [...new Set(order.items.map((i) => String(i.product)))].filter((id) => !done.has(id));
  }
  return {
    ...baseDto(order),
    items: await itemsDto(order),
    timeline: (order.history ?? [])
      .filter((h) => h.type === "created" || h.type === "status" || h.type === "message" || (h.type === "payment" && h.to === "paid"))
      .map((h) => eventDto(h, true)),
    canCancel: settings.checkout.allowCustomerCancel && CUSTOMER_CANCELLABLE.includes(status),
    courier: showCourier
      ? {
          name: order.delivery!.courierName!.split(" ")[0],
          vehicle: order.delivery?.vehicleType ? VEHICLE_LABELS[order.delivery.vehicleType as VehicleType] : "",
        }
      : null,
    pickupAddress,
    reviewableProductIds,
  };
}

export async function toStaffOrderDTO(order: OrderDoc): Promise<StaffOrderDTO> {
  const notifications = await Notification.find({ order: order._id, channel: { $ne: "in_app" } })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
  const d = order.delivery ?? ({} as OrderDoc["delivery"]);
  return {
    ...baseDto(order),
    items: await itemsDto(order),
    version: order.version ?? 0,
    userId: order.user ? String(order.user) : null,
    updatedAt: new Date(order.updatedAt).toISOString(),
    paidAt: iso(order.paidAt),
    cancelReason: order.cancelReason ?? "",
    requiresCourier: Boolean(order.fulfillment.requiresCourier),
    pickupAddress: "",
    delivery: {
      courierId: d?.courier ? String(d.courier) : null,
      courierName: d?.courierName ?? "",
      courierPhone: d?.courierPhone ?? "",
      vehicleType: (d?.vehicleType as VehicleType | null) ?? null,
      vehicleModel: d?.vehicleModel ?? "",
      vehicleRegistration: d?.vehicleRegistration ?? "",
      instructions: d?.instructions ?? "",
      assignedAt: iso(d?.assignedAt),
      dispatchedAt: iso(d?.dispatchedAt),
      deliveredAt: iso(d?.deliveredAt),
      attempts: d?.attempts ?? 0,
      failureReason: d?.failureReason ?? "",
    },
    internalNotes: (order.internalNotes ?? []).map((n) => ({
      id: String(n._id),
      body: n.body,
      authorName: n.authorName ?? "",
      createdAt: new Date(n.createdAt ?? Date.now()).toISOString(),
    })),
    history: (order.history ?? []).map((h) => eventDto(h, false)),
    notifications: notifications.map((n) => ({
      id: String(n._id),
      channel: n.channel,
      template: n.template,
      status: n.status,
      error: n.error ?? "",
      createdAt: new Date(n.createdAt).toISOString(),
    })),
  };
}

/* ------------------------------ Customer reads ---------------------------- */

export async function getOrderForUser(orderId: string, user: SessionUser): Promise<CustomerOrderDTO | null> {
  if (!mongoose.isValidObjectId(orderId)) return null;
  await connectDb();
  // Ownership enforced in the query itself (prevents broken object-level authorisation).
  const order = await Order.findOne({ _id: orderId, user: user.id }).lean<OrderDoc>();
  if (!order) return null;
  return toCustomerOrderDTO(order, await loadSettings(), { userId: user.id });
}

export async function getOrderByToken(orderNumber: string, token: string): Promise<CustomerOrderDTO | null> {
  if (!token || token.length > 128) return null;
  await connectDb();
  const order = await Order.findOne({ orderNumber: orderNumber.trim().toUpperCase(), accessTokenHashes: hashToken(token) }).lean<OrderDoc>();
  if (!order) return null;
  return toCustomerOrderDTO(order, await loadSettings());
}

export async function getOrderByLookup(orderNumber: string, email: string): Promise<CustomerOrderDTO | null> {
  await connectDb();
  const order = await Order.findOne({ orderNumber: orderNumber.trim().toUpperCase(), "customer.email": email.trim().toLowerCase() }).lean<OrderDoc>();
  if (!order) return null;
  return toCustomerOrderDTO(order, await loadSettings());
}

export async function listOrdersForUser(userId: string, page = 1): Promise<Paginated<OrderListItemDTO>> {
  await connectDb();
  const filter = { user: userId };
  const [docs, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 10).limit(10).lean<OrderDoc[]>(),
    Order.countDocuments(filter),
  ]);
  return { items: docs.map(listItem), total, page, pageSize: 10, pageCount: Math.max(1, Math.ceil(total / 10)) };
}

/* ------------------------------ Status changes ---------------------------- */

type Actor = { user: SessionUser | null; type: "staff" | "customer" | "system" };

async function loadOrderOrThrow(orderId: string): Promise<OrderDoc> {
  if (!mongoose.isValidObjectId(orderId)) throw notFound("order");
  const order = await Order.findById(orderId).lean<OrderDoc>();
  if (!order) throw notFound("order");
  return order;
}

function assertVersion(order: OrderDoc, expected: number) {
  if ((order.version ?? 0) !== expected) {
    throw ApiError.conflict("server.orders.staleVersion", { reason: "stale_version" });
  }
}

/** Applies a validated status transition. Shared by staff actions and customer cancellation. */
async function applyTransition(
  order: OrderDoc,
  to: OrderStatus,
  actor: Actor,
  opts: { note?: string; message?: string; reason?: string },
): Promise<OrderDoc> {
  const from = order.status as OrderStatus;
  const kind = order.fulfillment.kind as FulfillmentType;
  const check = checkTransition(from, to, {
    fulfillment: kind,
    hasCourier: Boolean(order.delivery?.courier || order.delivery?.courierName),
    requiresCourier: Boolean(order.fulfillment.requiresCourier),
    paymentStatus: order.paymentStatus as PaymentStatus,
    total: order.total,
  });
  if (!check.ok) throw ApiError.conflict(check.reason, { reason: "invalid_transition" });
  if ((to === "cancelled" || to === "delivery_failed") && actor.type === "staff" && (opts.reason ?? "").trim().length < 3) {
    throw ApiError.validation("server.orders.giveReason", { reason: "server.orders.giveReason" });
  }

  const now = new Date();
  const actorName = actor.type === "system" ? "System" : (actor.user?.name ?? "Customer");
  const set: Record<string, unknown> = { status: to };
  const inc: Record<string, number> = { version: 1 };
  const events: Record<string, unknown>[] = [
    {
      type: "status",
      from,
      to,
      actor: actor.user?.id ?? null,
      actorName,
      actorType: actor.type,
      note: [opts.note, to === "delivery_failed" || to === "cancelled" ? opts.reason : ""].filter(Boolean).join(" — ").slice(0, 1000),
      message: opts.message ?? "",
      at: now,
    },
  ];
  if (to === "out_for_delivery") {
    set["delivery.dispatchedAt"] = now;
    set["delivery.failureReason"] = "";
    inc["delivery.attempts"] = 1;
  }
  if (to === "delivery_failed") set["delivery.failureReason"] = opts.reason ?? "";
  if (to === "delivered") set["delivery.deliveredAt"] = now;
  if (to === "completed") set.completedAt = now;
  if (to === "cancelled") {
    set.cancelledAt = now;
    set.cancelReason = opts.reason || (actor.type === "customer" ? "Cancelled by customer" : "");
    if (order.paymentStatus === "unpaid") {
      set.paymentStatus = "voided";
      events.push({ type: "payment", from: "unpaid", to: "voided", actorName: "System", actorType: "system", at: now });
    }
  }

  return withTransaction(async (session) => {
    const res = await Order.updateOne(
      { _id: order._id, status: from, version: order.version ?? 0 },
      { $set: set, $inc: inc, $push: { history: { $each: events } } },
      { session },
    );
    if (res.modifiedCount !== 1) {
      throw ApiError.conflict("server.orders.staleVersion", { reason: "stale_version" });
    }
    if (to === "cancelled") {
      for (const item of order.items) {
        const restock = item.stockDecremented ? { stockQuantity: item.quantity } : {};
        await Product.updateOne(
          { _id: item.product },
          { $inc: { ...restock, unitsSold: -item.quantity } },
          { session },
        );
      }
      await Order.updateOne(
        { _id: order._id },
        { $set: { "items.$[].stockDecremented": false } },
        { session },
      );
    }
    if (actor.type === "staff") {
      await audit(
        {
          actor: actor.user,
          action: "order.status",
          entityType: "order",
          entityId: String(order._id),
          summary: `${order.orderNumber}: ${from} → ${to}`,
          meta: { reason: opts.reason || undefined },
        },
        session,
      );
    }
    return (await Order.findById(order._id).session(session).lean<OrderDoc>())!;
  });
}

export async function changeOrderStatus(
  orderId: string,
  input: z.infer<typeof statusChangeSchema>,
  user: SessionUser,
): Promise<StaffOrderDTO> {
  await connectDb();
  if (!hasPermission(user.role, permissionForTransition(input.to))) {
    throw ApiError.forbidden("server.orders.roleCannotChange");
  }
  const order = await loadOrderOrThrow(orderId);
  assertVersion(order, input.expectedVersion);
  const updated = await applyTransition(order, input.to, { user, type: "staff" }, input);
  if (input.to === "cancelled") invalidateBestsellers();
  runAfterResponse(() => notifyOrderStatus(updated, input.to, input.message || undefined));
  return toStaffOrderDTO(updated);
}

export async function cancelOrderAsCustomer(order: OrderDoc, user: SessionUser | null): Promise<void> {
  const settings = await loadSettings();
  if (!settings.checkout.allowCustomerCancel || !CUSTOMER_CANCELLABLE.includes(order.status as OrderStatus)) {
    throw ApiError.conflict("server.orders.cannotCancel");
  }
  const updated = await applyTransition(order, "cancelled", { user, type: "customer" }, { reason: "Cancelled by customer" });
  invalidateBestsellers();
  runAfterResponse(() => notifyOrderStatus(updated, "cancelled"));
}

export async function cancelOwnOrder(orderId: string, user: SessionUser) {
  await connectDb();
  if (!mongoose.isValidObjectId(orderId)) throw notFound("order");
  const order = await Order.findOne({ _id: orderId, user: user.id }).lean<OrderDoc>();
  if (!order) throw notFound("order");
  await cancelOrderAsCustomer(order, user);
}

export async function cancelOrderByToken(orderNumber: string, token: string) {
  await connectDb();
  const order = await Order.findOne({ orderNumber: orderNumber.trim().toUpperCase(), accessTokenHashes: hashToken(token) }).lean<OrderDoc>();
  if (!order) throw notFound("order");
  await cancelOrderAsCustomer(order, null);
}

/* -------------------------------- Payments -------------------------------- */

export async function changePaymentStatus(
  orderId: string,
  input: z.infer<typeof paymentChangeSchema>,
  user: SessionUser,
): Promise<StaffOrderDTO> {
  await connectDb();
  const order = await loadOrderOrThrow(orderId);
  assertVersion(order, input.expectedVersion);
  const from = order.paymentStatus as PaymentStatus;
  const check = checkPaymentTransition(from, input.to, order.status as OrderStatus);
  if (!check.ok) throw ApiError.conflict(check.reason, { reason: "invalid_transition" });
  const now = new Date();
  const res = await Order.updateOne(
    { _id: order._id, version: order.version ?? 0, paymentStatus: from },
    {
      $set: { paymentStatus: input.to, ...(input.to === "paid" ? { paidAt: now } : {}) },
      $inc: { version: 1 },
      $push: {
        history: { type: "payment", from, to: input.to, actor: user.id, actorName: user.name, actorType: "staff", note: input.note, at: now },
      },
    },
  );
  if (res.modifiedCount !== 1) throw ApiError.conflict("server.orders.staleVersion");
  await audit({
    actor: user,
    action: "order.payment",
    entityType: "order",
    entityId: String(order._id),
    summary: `${order.orderNumber}: payment ${from} → ${input.to}`,
  });
  return toStaffOrderDTO((await Order.findById(order._id).lean<OrderDoc>())!);
}

/* -------------------------------- Delivery -------------------------------- */

export async function assignDelivery(
  orderId: string,
  input: z.infer<typeof deliveryAssignSchema>,
  user: SessionUser,
): Promise<StaffOrderDTO> {
  await connectDb();
  const order = await loadOrderOrThrow(orderId);
  assertVersion(order, input.expectedVersion);
  if (order.fulfillment.kind !== "delivery") throw ApiError.conflict("server.orders.pickupNoDelivery");
  const status = order.status as OrderStatus;
  if (["delivered", "completed", "cancelled"].includes(status)) {
    throw ApiError.conflict("server.orders.deliveryClosed");
  }
  if (status === "out_for_delivery" && !input.courierId) {
    throw ApiError.conflict("server.orders.alreadyOut");
  }

  let courierName = "";
  let courierPhone = "";
  let vehicleType: VehicleType | null = input.vehicleType ?? null;
  let vehicleModel = input.vehicleModel;
  let vehicleRegistration = input.vehicleRegistration;
  if (input.courierId) {
    const courier = await Courier.findOne({ _id: input.courierId, isActive: true }).lean();
    if (!courier) throw ApiError.validation("server.orders.chooseCourier", { courierId: "server.orders.chooseCourier" });
    courierName = courier.name;
    courierPhone = courier.phone ?? "";
    vehicleType = vehicleType ?? (courier.vehicleType as VehicleType);
    vehicleModel = vehicleModel || courier.vehicleModel || "";
    vehicleRegistration = vehicleRegistration || courier.vehicleRegistration || "";
  } else {
    vehicleType = null;
    vehicleModel = "";
    vehicleRegistration = "";
  }
  if (!vehicleType || !MOTOR_VEHICLES.includes(vehicleType)) {
    vehicleRegistration = "";
    if (!vehicleType || vehicleType === "on_foot") vehicleModel = "";
  }

  const now = new Date();
  const summary = input.courierId
    ? `Courier: ${courierName}${vehicleType ? ` (${VEHICLE_LABELS[vehicleType]}${vehicleRegistration ? `, ${vehicleRegistration}` : ""})` : ""}`
    : "Courier assignment removed";
  const res = await Order.updateOne(
    { _id: order._id, version: order.version ?? 0 },
    {
      $set: {
        "delivery.courier": input.courierId ?? null,
        "delivery.courierName": courierName,
        "delivery.courierPhone": courierPhone,
        "delivery.vehicleType": vehicleType,
        "delivery.vehicleModel": vehicleModel,
        "delivery.vehicleRegistration": vehicleRegistration.toUpperCase(),
        "delivery.instructions": input.instructions,
        "delivery.assignedAt": input.courierId ? now : null,
      },
      $inc: { version: 1 },
      $push: {
        history: {
          type: "delivery",
          actor: user.id,
          actorName: user.name,
          actorType: "staff",
          note: [summary, input.note].filter(Boolean).join(" — "),
          at: now,
        },
      },
    },
  );
  if (res.modifiedCount !== 1) throw ApiError.conflict("server.orders.staleVersion");
  await audit({ actor: user, action: "order.delivery", entityType: "order", entityId: String(order._id), summary: `${order.orderNumber}: ${summary}` });
  return toStaffOrderDTO((await Order.findById(order._id).lean<OrderDoc>())!);
}

/* --------------------------------- Notes ---------------------------------- */

export async function addOrderNote(orderId: string, kind: "internal" | "customer", body: string, user: SessionUser) {
  await connectDb();
  const order = await loadOrderOrThrow(orderId);
  const now = new Date();
  const update =
    kind === "internal"
      ? { $push: { internalNotes: { body, author: user.id, authorName: user.name, createdAt: now } }, $inc: { version: 1 } }
      : {
          $push: { history: { type: "message", actor: user.id, actorName: user.name, actorType: "staff", message: body, at: now } },
          $inc: { version: 1 },
        };
  await Order.updateOne({ _id: order._id }, update);
  await audit({
    actor: user,
    action: kind === "internal" ? "order.note" : "order.message",
    entityType: "order",
    entityId: String(order._id),
    summary: `${order.orderNumber}: ${kind === "internal" ? "internal note added" : "customer message sent"}`,
  });
  if (kind === "customer") runAfterResponse(() => notifyCustomerMessage(order, body));
  return toStaffOrderDTO((await Order.findById(order._id).lean<OrderDoc>())!);
}

/* ------------------------------ Admin listing ----------------------------- */

function listItem(o: OrderDoc): OrderListItemDTO {
  return {
    id: String(o._id),
    orderNumber: o.orderNumber,
    createdAt: new Date(o.createdAt).toISOString(),
    customerName: o.customer.name,
    customerPhone: o.customer.phone,
    itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
    total: o.total,
    currency: o.currency as CurrencyCode,
    paymentMethod: o.paymentMethod as OrderListItemDTO["paymentMethod"],
    paymentStatus: o.paymentStatus as PaymentStatus,
    status: o.status as OrderStatus,
    fulfillmentType: o.fulfillment.kind as FulfillmentType,
    methodName: o.fulfillment.methodName,
    requiresCourier: Boolean(o.fulfillment.requiresCourier),
    courierName: o.delivery?.courierName ?? "",
    deliveryDate: o.deliveryDate,
    timeWindowLabel: o.timeWindow?.label ?? "",
    zone: o.address?.zone ?? "",
  };
}

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

export function resolveDateRange(
  range: OrderListQuery["range"],
  from: string | undefined,
  to: string | undefined,
  timeZone: string,
): { from: string; to: string } | null {
  const today = toDateKey(new Date(), timeZone);
  switch (range) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = addDaysToKey(today, -1);
      return { from: y, to: y };
    }
    case "7d":
      return { from: addDaysToKey(today, -6), to: today };
    case "30d":
      return { from: addDaysToKey(today, -29), to: today };
    case "custom":
      if (from && to) return from <= to ? { from, to } : { from: to, to: from };
      if (from) return { from, to: from };
      return null;
    default:
      return null;
  }
}

export function buildOrderFilter(query: OrderListQuery, timeZone: string): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (query.status) {
    const statuses = query.status.split(",").filter(Boolean);
    if (statuses.length) filter.status = { $in: statuses };
  }
  if (query.payment) filter.paymentStatus = query.payment;
  if (query.fulfillment) filter["fulfillment.kind"] = query.fulfillment;
  if (query.courier) filter["delivery.courier"] = new mongoose.Types.ObjectId(query.courier);
  const range = resolveDateRange(query.range, query.from, query.to, timeZone);
  if (range) {
    if (query.dateField === "delivery") {
      filter.deliveryDate = { $gte: range.from, $lte: range.to };
    } else {
      const { start, end } = zonedDayRange(range.from, range.to, timeZone);
      filter.createdAt = { $gte: start, $lt: end };
    }
  }
  const q = query.q?.trim();
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ orderNumber: rx }, { "customer.name": rx }, { "customer.email": rx }, { "customer.phone": rx }, { "recipient.name": rx }];
  }
  return filter;
}

export async function listOrdersAdmin(query: OrderListQuery): Promise<Paginated<OrderListItemDTO>> {
  await connectDb();
  const settings = await loadSettings();
  const filter = buildOrderFilter(query, settings.timeZone);
  const sort: Record<string, 1 | -1> =
    query.sort === "oldest"
      ? { createdAt: 1 }
      : query.sort === "total_desc"
        ? { total: -1 }
        : query.sort === "total_asc"
          ? { total: 1 }
          : query.sort === "delivery_date"
            ? { deliveryDate: 1, "timeWindow.start": 1 }
            : { createdAt: -1 };
  const page = query.page ?? 1;
  const [docs, total] = await Promise.all([
    Order.find(filter).sort({ ...sort, _id: -1 }).skip((page - 1) * ORDER_PAGE_SIZE).limit(ORDER_PAGE_SIZE).lean<OrderDoc[]>(),
    Order.countDocuments(filter),
  ]);
  return { items: docs.map(listItem), total, page, pageSize: ORDER_PAGE_SIZE, pageCount: Math.max(1, Math.ceil(total / ORDER_PAGE_SIZE)) };
}

export async function exportOrdersAdmin(query: OrderListQuery): Promise<OrderDoc[]> {
  await connectDb();
  const settings = await loadSettings();
  return Order.find(buildOrderFilter(query, settings.timeZone)).sort({ createdAt: -1 }).limit(10000).lean<OrderDoc[]>();
}

export async function getStaffOrder(orderId: string): Promise<StaffOrderDTO | null> {
  if (!mongoose.isValidObjectId(orderId)) return null;
  await connectDb();
  const order = await Order.findById(orderId).lean<OrderDoc>();
  return order ? toStaffOrderDTO(order) : null;
}
