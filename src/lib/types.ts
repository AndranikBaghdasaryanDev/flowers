/** Data transfer objects shared between server code and client components. */
import type { CurrencyCode } from "@/lib/domain/money";
import type {
  FulfillmentType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  VehicleType,
} from "@/lib/domain/orders";

export type ImageDTO = { src: string; alt: string; width: number; height: number };

export type ProductBadge = "bestseller" | "new" | "sale";

export type CategoryRef = { id: string; name: string; slug: string; kind: "collection" | "occasion" };

export type ProductCardDTO = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  price: number;
  compareAtPrice: number | null;
  currency: CurrencyCode;
  image: ImageDTO | null;
  hoverImage: ImageDTO | null;
  badges: ProductBadge[];
  purchasable: boolean;
  availabilityLabel: string;
  lowStock: number | null;
  maxQuantity: number;
  category: CategoryRef | null;
  isSample: boolean;
};

export type ProductDetailDTO = ProductCardDTO & {
  description: string;
  images: ImageDTO[];
  composition: string[];
  colors: string[];
  sizeLabel: string;
  dimensions: string;
  careInstructions: string;
  allowGiftMessage: boolean;
  occasions: CategoryRef[];
  seoTitle: string;
  seoDescription: string;
  updatedAt: string;
};

export type CategoryDTO = CategoryRef & {
  description: string;
  image: ImageDTO | null;
  isFeatured: boolean;
  productCount: number;
  seoTitle: string;
  seoDescription: string;
  isSample: boolean;
};

export type TimeWindowDTO = { label: string; start: string; end: string };

export type DeliveryMethodDTO = {
  id: string;
  name: string;
  type: FulfillmentType;
  description: string;
  fee: number;
  freeOverAmount: number | null;
  minOrderAmount: number;
  /** `aliases`: the area name in every language, so a translated name is accepted at checkout. */
  zones: { name: string; fee: number | null; aliases?: string[] }[];
  city: string;
  /** The city name in every language. */
  cityAliases?: string[];
  estimatedTime: string;
  leadTimeMinutes: number;
  maxDaysAhead: number;
  availableWeekdays: number[];
  timeWindows: TimeWindowDTO[];
  requiresCourier: boolean;
  pickupAddress: string;
};

export type QuoteLineDTO = {
  productId: string;
  slug: string;
  name: string;
  image: ImageDTO | null;
  unitPrice: number;
  compareAtPrice: number | null;
  requestedQuantity: number;
  quantity: number;
  lineTotal: number;
  maxQuantity: number;
  status: "ok" | "unavailable" | "not_found" | "quantity_reduced";
  message: string;
};

export type QuoteDTO = {
  currency: CurrencyCode;
  lines: QuoteLineDTO[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number | null;
  discountTotal: number;
  total: number;
  deliveryMessage: string;
  issues: string[];
};

export type OrderItemDTO = {
  id: string;
  productId: string;
  name: string;
  slug: string;
  image: ImageDTO | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type OrderEventDTO = {
  id: string;
  type: "created" | "status" | "payment" | "delivery" | "note" | "message";
  from: string | null;
  to: string | null;
  actorName: string;
  actorType: "customer" | "staff" | "system";
  note?: string;
  message: string;
  at: string;
};

export type OrderAddressDTO = {
  city: string;
  zone: string;
  street: string;
  building: string;
  apartment: string;
  entrance: string;
  floor: string;
  notes: string;
};

/** What a customer may see about their order. Never includes internal notes. */
export type CustomerOrderDTO = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  statusLabel: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  fulfillment: { type: FulfillmentType; methodName: string };
  address: OrderAddressDTO | null;
  deliveryDate: string;
  timeWindow: TimeWindowDTO | null;
  customer: { name: string; email: string; phone: string };
  recipient: { name: string; phone: string };
  items: OrderItemDTO[];
  currency: CurrencyCode;
  subtotal: number;
  deliveryFee: number;
  discountTotal: number;
  total: number;
  giftMessage: string;
  customerComment: string;
  timeline: OrderEventDTO[];
  canCancel: boolean;
  courier: { name: string; vehicle: string } | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  pickupAddress: string;
  reviewableProductIds: string[];
};

export type StaffOrderDTO = Omit<CustomerOrderDTO, "timeline" | "canCancel" | "courier" | "reviewableProductIds"> & {
  version: number;
  userId: string | null;
  updatedAt: string;
  paidAt: string | null;
  cancelReason: string;
  requiresCourier: boolean;
  delivery: {
    courierId: string | null;
    courierName: string;
    courierPhone: string;
    vehicleType: VehicleType | null;
    vehicleModel: string;
    vehicleRegistration: string;
    instructions: string;
    assignedAt: string | null;
    dispatchedAt: string | null;
    deliveredAt: string | null;
    attempts: number;
    failureReason: string;
  };
  internalNotes: { id: string; body: string; authorName: string; createdAt: string }[];
  history: OrderEventDTO[];
  notifications: { id: string; channel: string; template: string; status: string; error: string; createdAt: string }[];
};

export type OrderListItemDTO = {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  itemCount: number;
  total: number;
  currency: CurrencyCode;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  methodName: string;
  requiresCourier: boolean;
  courierName: string;
  deliveryDate: string;
  timeWindowLabel: string;
  zone: string;
};

export type Paginated<T> = { items: T[]; total: number; page: number; pageCount: number; pageSize: number };

export type ApiErrorBody = {
  error: { code: string; message: string; fields?: Record<string, string>; meta?: Record<string, unknown> };
};
