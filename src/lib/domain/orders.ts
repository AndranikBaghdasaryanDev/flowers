/**
 * Order lifecycle rules. This module is pure and shared by the server
 * (which enforces it) and the admin UI (which only offers valid actions).
 */
import type { Permission } from "@/lib/domain/roles";
import { msg, type Msg } from "@/lib/api/errors";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "delivery_failed",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "voided"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["cash_on_delivery", "cash_on_pickup"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const FULFILLMENT_TYPES = ["delivery", "pickup"] as const;
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

export const VEHICLE_TYPES = ["car", "van", "moped", "motorcycle", "bicycle", "on_foot", "other"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

/** Vehicle types for which a registration number is meaningful. */
export const MOTOR_VEHICLES: readonly VehicleType[] = ["car", "van", "moped", "motorcycle"];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending confirmation",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  delivery_failed: "Delivery failed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function orderStatusLabel(status: OrderStatus, fulfillment?: FulfillmentType): string {
  if (status === "ready") {
    return fulfillment === "pickup" ? "Ready for pickup" : fulfillment === "delivery" ? "Ready for dispatch" : "Ready";
  }
  if (status === "completed" && fulfillment === "pickup") return "Picked up";
  return ORDER_STATUS_LABELS[status];
}

/** Dictionary key of a status label (the `orderStatus` namespace), mirroring orderStatusLabel(). */
export function orderStatusKey(status: OrderStatus, fulfillment?: FulfillmentType): string {
  if (status === "ready") return fulfillment === "pickup" ? "orderStatus.readyPickup" : fulfillment === "delivery" ? "orderStatus.readyDispatch" : "orderStatus.ready";
  if (status === "completed" && fulfillment === "pickup") return "orderStatus.pickedUp";
  return `orderStatus.${status}`;
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  refunded: "Refunded",
  voided: "Voided",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash_on_delivery: "Cash on delivery",
  cash_on_pickup: "Pay at pickup",
};

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  car: "Car",
  van: "Van",
  moped: "Moped / scooter",
  motorcycle: "Motorcycle",
  bicycle: "Bicycle",
  on_foot: "On foot",
  other: "Other",
};

export const TERMINAL_STATUSES: readonly OrderStatus[] = ["completed", "cancelled"];

/** Allowed transitions per fulfilment type. */
const TRANSITIONS: Record<FulfillmentType, Record<OrderStatus, readonly OrderStatus[]>> = {
  delivery: {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["out_for_delivery", "cancelled"],
    out_for_delivery: ["delivered", "delivery_failed"],
    delivery_failed: ["out_for_delivery", "ready", "cancelled"],
    delivered: ["completed"],
    completed: [],
    cancelled: [],
  },
  pickup: {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["completed", "cancelled"],
    out_for_delivery: [],
    delivery_failed: [],
    delivered: [],
    completed: [],
    cancelled: [],
  },
};

export function allowedNextStatuses(current: OrderStatus, fulfillment: FulfillmentType): readonly OrderStatus[] {
  return TRANSITIONS[fulfillment][current] ?? [];
}

/** Permission needed to move an order INTO `to`. */
export function permissionForTransition(to: OrderStatus): Permission {
  if (to === "cancelled") return "orders:cancel";
  if (to === "out_for_delivery" || to === "delivered" || to === "delivery_failed") return "delivery:manage";
  return "orders:update";
}

export type TransitionContext = {
  fulfillment: FulfillmentType;
  hasCourier: boolean;
  requiresCourier: boolean;
  paymentStatus: PaymentStatus;
  total: number;
};

/** `reason` is a translatable message (see `@/lib/api/errors`). */
export type TransitionCheck = { ok: true } | { ok: false; reason: Msg };

export function checkTransition(from: OrderStatus, to: OrderStatus, ctx: TransitionContext): TransitionCheck {
  if (from === to) return { ok: false, reason: msg("server.orders.sameStatus") };
  if (!allowedNextStatuses(from, ctx.fulfillment).includes(to)) {
    return {
      ok: false,
      reason: msg("server.orders.invalidTransition", {
        from: msg(orderStatusKey(from, ctx.fulfillment)),
        to: msg(orderStatusKey(to, ctx.fulfillment)),
      }),
    };
  }
  if (to === "out_for_delivery" && ctx.requiresCourier && !ctx.hasCourier) {
    return { ok: false, reason: msg("server.orders.assignCourierFirst") };
  }
  if (to === "completed" && ctx.total > 0 && ctx.paymentStatus !== "paid") {
    return { ok: false, reason: msg("server.orders.recordPaymentFirst") };
  }
  return { ok: true };
}

/** Payment status transitions (performed by staff with payments:manage). */
const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  unpaid: ["paid"],
  paid: ["refunded"],
  refunded: [],
  voided: [],
};

export function checkPaymentTransition(
  from: PaymentStatus,
  to: PaymentStatus,
  orderStatus: OrderStatus,
): TransitionCheck {
  if (!PAYMENT_TRANSITIONS[from].includes(to)) {
    return {
      ok: false,
      reason: msg("server.orders.invalidPaymentTransition", { from: msg(`paymentStatus.${from}`), to: msg(`paymentStatus.${to}`) }),
    };
  }
  if (to === "paid" && orderStatus === "cancelled") {
    return { ok: false, reason: msg("server.orders.cancelledNotPaid") };
  }
  return { ok: true };
}

/** Statuses at which the customer can still cancel the order themselves. */
export const CUSTOMER_CANCELLABLE: readonly OrderStatus[] = ["pending"];

/** Customer-facing progress steps. */
export function progressSteps(fulfillment: FulfillmentType): OrderStatus[] {
  return fulfillment === "pickup"
    ? ["pending", "confirmed", "preparing", "ready", "completed"]
    : ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"];
}

/** Orders in these statuses count as "open" work for staff. */
export const OPEN_STATUSES: readonly OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivery_failed",
];
