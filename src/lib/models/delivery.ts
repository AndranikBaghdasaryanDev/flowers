import { FULFILLMENT_TYPES, VEHICLE_TYPES, type FulfillmentType, type VehicleType } from "@/lib/domain/orders";
import { defineSchema, getModel, i18nField, type I18nOverrides, type Id } from "./_util";

const zoneSchema = defineSchema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    /** Optional zone-specific fee; when null the method fee applies. */
    fee: { type: Number, min: 0, default: null },
  },
  { _id: false },
);

const timeWindowSchema = defineSchema(
  {
    label: { type: String, required: true, trim: true, maxlength: 40 },
    start: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    end: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
  },
  { _id: false },
);

const deliveryMethodSchema = defineSchema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    type: { type: String, enum: FULFILLMENT_TYPES, required: true },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    isActive: { type: Boolean, default: true },
    fee: { type: Number, min: 0, default: 0 },
    /** Orders whose subtotal reaches this amount get free fulfilment. Null = never. */
    freeOverAmount: { type: Number, min: 0, default: null },
    minOrderAmount: { type: Number, min: 0, default: 0 },
    /** Coverage: when non-empty, the address must be in one of these zones. */
    zones: { type: [zoneSchema], default: [] },
    city: { type: String, trim: true, maxlength: 80, default: "" },
    /** Shown to customers verbatim, e.g. "Usually within 2–3 hours". Empty = no promise shown. */
    estimatedTime: { type: String, trim: true, maxlength: 120, default: "" },
    leadTimeMinutes: { type: Number, min: 0, max: 60 * 24 * 14, default: 120 },
    maxDaysAhead: { type: Number, min: 0, max: 365, default: 30 },
    availableWeekdays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
    timeWindows: { type: [timeWindowSchema], default: [] },
    requiresCourier: { type: Boolean, default: false },
    pickupAddress: { type: String, trim: true, maxlength: 300, default: "" },
    sortOrder: { type: Number, default: 0 },
    /** Translated text; `zones` holds area names aligned with `zones` above by position. */
    i18n: i18nField({ name: 80, description: 500, city: 80, estimatedTime: 120, pickupAddress: 300, zones: [80] }),
  },
  { timestamps: true },
);

export type DeliveryMethodText = Pick<DeliveryMethodDoc, "name" | "description" | "city" | "estimatedTime" | "pickupAddress"> & {
  zones: string[];
};

export interface DeliveryMethodDoc {
  _id: Id;
  name: string;
  type: FulfillmentType;
  description: string;
  isActive: boolean;
  fee: number;
  freeOverAmount: number | null;
  minOrderAmount: number;
  zones: { name: string; fee: number | null }[];
  city: string;
  estimatedTime: string;
  leadTimeMinutes: number;
  maxDaysAhead: number;
  availableWeekdays: number[];
  timeWindows: { label: string; start: string; end: string }[];
  requiresCourier: boolean;
  pickupAddress: string;
  sortOrder: number;
  i18n?: I18nOverrides<DeliveryMethodText>;
}
export const DeliveryMethod = getModel<DeliveryMethodDoc>("DeliveryMethod", deliveryMethodSchema);

const courierSchema = defineSchema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 32, default: "" },
    vehicleType: { type: String, enum: VEHICLE_TYPES, default: "car" },
    vehicleModel: { type: String, trim: true, maxlength: 80, default: "" },
    vehicleRegistration: { type: String, trim: true, maxlength: 20, default: "" },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export interface CourierDoc {
  _id: Id;
  name: string;
  phone: string;
  vehicleType: VehicleType;
  vehicleModel: string;
  vehicleRegistration: string;
  notes: string;
  isActive: boolean;
}
export const Courier = getModel<CourierDoc>("Courier", courierSchema);
