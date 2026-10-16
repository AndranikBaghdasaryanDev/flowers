import { ROLES, type Role } from "@/lib/domain/roles";
import { defineSchema, getModel, ObjectId, type Id } from "./_util";

const addressSchema = defineSchema(
  {
    label: { type: String, trim: true, maxlength: 40, default: "" },
    recipientName: { type: String, trim: true, maxlength: 120, required: true },
    phone: { type: String, trim: true, maxlength: 32, required: true },
    city: { type: String, trim: true, maxlength: 80, required: true },
    zone: { type: String, trim: true, maxlength: 80, default: "" },
    street: { type: String, trim: true, maxlength: 160, required: true },
    building: { type: String, trim: true, maxlength: 40, default: "" },
    apartment: { type: String, trim: true, maxlength: 40, default: "" },
    entrance: { type: String, trim: true, maxlength: 20, default: "" },
    floor: { type: String, trim: true, maxlength: 20, default: "" },
    notes: { type: String, trim: true, maxlength: 300, default: "" },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const cartItemSchema = defineSchema(
  {
    product: { type: ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1, max: 99 },
  },
  { _id: false },
);

const userSchema = defineSchema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 32, default: "" },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "customer", index: true },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    emailVerifiedAt: { type: Date, default: null },
    addresses: { type: [addressSchema], default: [] },
    favorites: { type: [{ type: ObjectId, ref: "Product" }], default: [] },
    cart: {
      items: { type: [cartItemSchema], default: [] },
      giftMessage: { type: String, maxlength: 500, default: "" },
      updatedAt: { type: Date, default: null },
    },
    lastLoginAt: { type: Date, default: null },
    marketingOptIn: { type: Boolean, default: false },
  },
  { timestamps: true },
);
userSchema.index({ name: "text", email: "text", phone: "text" });
userSchema.index({ createdAt: -1 });

export interface AddressFields {
  _id?: Id;
  label: string;
  recipientName: string;
  phone: string;
  city: string;
  zone: string;
  street: string;
  building: string;
  apartment: string;
  entrance: string;
  floor: string;
  notes: string;
  isDefault: boolean;
}

export interface UserDoc {
  _id: Id;
  email: string;
  name: string;
  phone: string;
  passwordHash: string;
  role: Role;
  status: "active" | "disabled";
  emailVerifiedAt: Date | null;
  addresses: AddressFields[];
  favorites: Id[];
  cart: { items: { product: Id; quantity: number }[]; giftMessage: string; updatedAt: Date | null };
  lastLoginAt: Date | null;
  marketingOptIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export const User = getModel<UserDoc>("User", userSchema);

const sessionSchema = defineSchema(
  {
    tokenHash: { type: String, required: true, unique: true },
    user: { type: ObjectId, ref: "User", required: true, index: true },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, default: () => new Date() },
    userAgent: { type: String, maxlength: 300, default: "" },
    ip: { type: String, maxlength: 64, default: "" },
  },
  { timestamps: true },
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export interface SessionDoc {
  _id: Id;
  tokenHash: string;
  user: Id;
  expiresAt: Date;
  lastSeenAt: Date;
  userAgent: string;
  ip: string;
}
export const Session = getModel<SessionDoc>("Session", sessionSchema);

const authTokenSchema = defineSchema(
  {
    user: { type: ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["email_verify", "password_reset"], required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

export interface AuthTokenDoc {
  _id: Id;
  user: Id;
  type: "email_verify" | "password_reset";
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}
export const AuthToken = getModel<AuthTokenDoc>("AuthToken", authTokenSchema);
