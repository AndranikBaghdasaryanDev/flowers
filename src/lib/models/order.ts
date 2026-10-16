import {
  FULFILLMENT_TYPES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  VEHICLE_TYPES,
  type FulfillmentType,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
  type VehicleType,
} from "@/lib/domain/orders";
import { CURRENCY_CODES } from "@/lib/domain/money";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/config";
import { defineSchema, getModel, ObjectId, type Id } from "./_util";

/** Immutable snapshot of a purchased product, captured at order time. */
const orderItemSchema = defineSchema(
  {
    product: { type: ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    image: { type: ObjectId, ref: "Media", default: null },
    imageAlt: { type: String, default: "" },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
    stockDecremented: { type: Boolean, default: false },
  },
  { _id: true },
);

const historySchema = defineSchema(
  {
    type: { type: String, enum: ["created", "status", "payment", "delivery", "note", "message"], required: true },
    from: { type: String, default: null },
    to: { type: String, default: null },
    actor: { type: ObjectId, ref: "User", default: null },
    actorName: { type: String, default: "System" },
    actorType: { type: String, enum: ["customer", "staff", "system"], default: "system" },
    /** Internal (staff-only) note attached to this event. Never sent to customers. */
    note: { type: String, maxlength: 1000, default: "" },
    /** Message visible to the customer on their order page. */
    message: { type: String, maxlength: 1000, default: "" },
    at: { type: Date, default: () => new Date() },
  },
  { _id: true },
);

const noteSchema = defineSchema(
  {
    body: { type: String, required: true, maxlength: 2000 },
    author: { type: ObjectId, ref: "User", default: null },
    authorName: { type: String, default: "" },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: true },
);

const orderSchema = defineSchema(
  {
    orderNumber: { type: String, required: true, unique: true },
    idempotencyKey: { type: String, default: undefined },
    /** SHA-256 hashes of guest tracking tokens (a retried checkout issues an extra token). */
    accessTokenHashes: { type: [String], default: [], select: false },
    user: { type: ObjectId, ref: "User", default: null, index: true },
    /** Language the order was placed in; customer emails use it. */
    locale: { type: String, enum: LOCALES, default: DEFAULT_LOCALE },
    customer: {
      name: { type: String, required: true, maxlength: 120 },
      email: { type: String, required: true, lowercase: true, maxlength: 254 },
      phone: { type: String, required: true, maxlength: 32 },
    },
    recipient: {
      name: { type: String, maxlength: 120, default: "" },
      phone: { type: String, maxlength: 32, default: "" },
    },
    fulfillment: {
      // Named `kind` (not `type`) because `type` is reserved in Mongoose nested paths.
      kind: { type: String, enum: FULFILLMENT_TYPES, required: true },
      method: { type: ObjectId, ref: "DeliveryMethod", required: true },
      methodName: { type: String, required: true },
      requiresCourier: { type: Boolean, default: false },
    },
    address: {
      type: defineSchema(
        {
          city: String,
          zone: String,
          street: String,
          building: String,
          apartment: String,
          entrance: String,
          floor: String,
          notes: String,
        },
        { _id: false },
      ),
      default: null,
    },
    deliveryDate: { type: String, required: true, index: true },
    timeWindow: {
      type: defineSchema({ label: String, start: String, end: String }, { _id: false }),
      default: null,
    },
    items: { type: [orderItemSchema], required: true },
    currency: { type: String, enum: CURRENCY_CODES, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "unpaid", index: true },
    paidAt: { type: Date, default: null },
    status: { type: String, enum: ORDER_STATUSES, default: "pending", index: true },
    giftMessage: { type: String, maxlength: 500, default: "" },
    customerComment: { type: String, maxlength: 1000, default: "" },
    delivery: {
      courier: { type: ObjectId, ref: "Courier", default: null },
      courierName: { type: String, default: "" },
      courierPhone: { type: String, default: "" },
      vehicleType: { type: String, enum: [...VEHICLE_TYPES, null], default: null },
      vehicleModel: { type: String, maxlength: 80, default: "" },
      vehicleRegistration: { type: String, maxlength: 20, default: "" },
      instructions: { type: String, maxlength: 500, default: "" },
      assignedAt: { type: Date, default: null },
      dispatchedAt: { type: Date, default: null },
      deliveredAt: { type: Date, default: null },
      attempts: { type: Number, default: 0 },
      failureReason: { type: String, maxlength: 500, default: "" },
    },
    internalNotes: { type: [noteSchema], default: [] },
    history: { type: [historySchema], default: [] },
    cancelReason: { type: String, maxlength: 500, default: "" },
    cancelledAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    /** Incremented on every staff mutation; used for optimistic concurrency. */
    version: { type: Number, default: 0 },
  },
  { timestamps: true },
);
orderSchema.index({ idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ "customer.email": 1 });
orderSchema.index({ "customer.phone": 1 });
orderSchema.index({ "delivery.courier": 1, status: 1 });

export interface OrderItemFields {
  _id: Id;
  product: Id;
  name: string;
  slug: string;
  image: Id | null;
  imageAlt: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  stockDecremented: boolean;
}

export interface OrderHistoryFields {
  _id: Id;
  type: "created" | "status" | "payment" | "delivery" | "note" | "message";
  from: string | null;
  to: string | null;
  actor: Id | null;
  actorName: string;
  actorType: "customer" | "staff" | "system";
  note: string;
  message: string;
  at: Date;
}

export interface OrderDoc {
  _id: Id;
  orderNumber: string;
  idempotencyKey?: string;
  accessTokenHashes: string[];
  user: Id | null;
  locale?: Locale;
  customer: { name: string; email: string; phone: string };
  recipient: { name: string; phone: string };
  fulfillment: { kind: FulfillmentType; method: Id; methodName: string; requiresCourier: boolean };
  address: {
    city: string;
    zone: string;
    street: string;
    building: string;
    apartment: string;
    entrance: string;
    floor: string;
    notes: string;
  } | null;
  deliveryDate: string;
  timeWindow: { label: string; start: string; end: string } | null;
  items: OrderItemFields[];
  currency: string;
  subtotal: number;
  deliveryFee: number;
  discountTotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAt: Date | null;
  status: OrderStatus;
  giftMessage: string;
  customerComment: string;
  delivery: {
    courier: Id | null;
    courierName: string;
    courierPhone: string;
    vehicleType: VehicleType | null;
    vehicleModel: string;
    vehicleRegistration: string;
    instructions: string;
    assignedAt: Date | null;
    dispatchedAt: Date | null;
    deliveredAt: Date | null;
    attempts: number;
    failureReason: string;
  };
  internalNotes: { _id: Id; body: string; author: Id | null; authorName: string; createdAt: Date }[];
  history: OrderHistoryFields[];
  cancelReason: string;
  cancelledAt: Date | null;
  completedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
export const Order = getModel<OrderDoc>("Order", orderSchema);

const counterSchema = defineSchema({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } });
export const Counter = getModel<{ _id: string; seq: number }>("Counter", counterSchema);
