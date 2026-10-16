import { CURRENCY_CODES } from "@/lib/domain/money";
import { defineSchema, getModel, ObjectId, type Id } from "./_util";

/** Singleton document (_id: "store") holding business configuration and editable content. */
const settingsSchema = defineSchema(
  {
    _id: { type: String, default: "store" },
    storeName: { type: String, default: "Floriani Flowers", maxlength: 80 },
    tagline: { type: String, default: "", maxlength: 160 },
    currency: { type: String, enum: CURRENCY_CODES, default: "AMD" },
    timeZone: { type: String, default: "Asia/Yerevan" },
    contact: {
      phone: { type: String, default: "", maxlength: 40 },
      email: { type: String, default: "", maxlength: 254 },
      whatsapp: { type: String, default: "", maxlength: 40 },
      address: { type: String, default: "", maxlength: 300 },
      hours: { type: String, default: "", maxlength: 300 },
      mapUrl: { type: String, default: "", maxlength: 500 },
    },
    social: {
      instagram: { type: String, default: "https://www.instagram.com/floriani.flowers/", maxlength: 300 },
      facebook: { type: String, default: "", maxlength: 300 },
      telegram: { type: String, default: "", maxlength: 300 },
    },
    checkout: {
      guestCheckout: { type: Boolean, default: true },
      allowCustomerCancel: { type: Boolean, default: true },
      cashOnDelivery: { type: Boolean, default: true },
      cashOnPickup: { type: Boolean, default: true },
      maxQuantityPerItem: { type: Number, default: 20, min: 1, max: 99 },
      orderNotice: { type: String, default: "", maxlength: 500 },
    },
    content: {
      announcement: { type: String, default: "", maxlength: 160 },
      heroEyebrow: { type: String, default: "", maxlength: 80 },
      heroTitle: { type: String, default: "", maxlength: 120 },
      heroSubtitle: { type: String, default: "", maxlength: 300 },
      heroImage: { type: ObjectId, ref: "Media", default: null },
      heroImageAlt: { type: String, default: "", maxlength: 200 },
      storyTitle: { type: String, default: "", maxlength: 120 },
      storyBody: { type: String, default: "", maxlength: 3000 },
      storyImage: { type: ObjectId, ref: "Media", default: null },
      storyImageAlt: { type: String, default: "", maxlength: 200 },
      aboutBody: { type: String, default: "", maxlength: 6000 },
      deliveryInfo: { type: String, default: "", maxlength: 3000 },
    },
    legal: {
      privacy: { type: String, default: "", maxlength: 20000 },
      terms: { type: String, default: "", maxlength: 20000 },
      returns: { type: String, default: "", maxlength: 20000 },
      reviewedAt: { type: Date, default: null },
    },
  },
  { timestamps: true, _id: false },
);

export interface SettingsDoc {
  _id: string;
  storeName: string;
  tagline: string;
  currency: string;
  timeZone: string;
  contact: { phone: string; email: string; whatsapp: string; address: string; hours: string; mapUrl: string };
  social: { instagram: string; facebook: string; telegram: string };
  checkout: {
    guestCheckout: boolean;
    allowCustomerCancel: boolean;
    cashOnDelivery: boolean;
    cashOnPickup: boolean;
    maxQuantityPerItem: number;
    orderNotice: string;
  };
  content: {
    announcement: string;
    heroEyebrow: string;
    heroTitle: string;
    heroSubtitle: string;
    heroImage: Id | null;
    heroImageAlt: string;
    storyTitle: string;
    storyBody: string;
    storyImage: Id | null;
    storyImageAlt: string;
    aboutBody: string;
    deliveryInfo: string;
  };
  legal: { privacy: string; terms: string; returns: string; reviewedAt: Date | null };
  updatedAt?: Date;
}
export const Settings = getModel<SettingsDoc>("Settings", settingsSchema);

const galleryItemSchema = defineSchema(
  {
    image: { type: ObjectId, ref: "Media", required: true },
    alt: { type: String, required: true, maxlength: 200 },
    caption: { type: String, maxlength: 200, default: "" },
    link: { type: String, maxlength: 300, default: "" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true },
);
export interface GalleryItemDoc {
  _id: Id;
  image: Id;
  alt: string;
  caption: string;
  link: string;
  sortOrder: number;
  isActive: boolean;
  isSample: boolean;
}
export const GalleryItem = getModel<GalleryItemDoc>("GalleryItem", galleryItemSchema);

const subscriberSchema = defineSchema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    status: { type: String, enum: ["subscribed", "unsubscribed"], default: "subscribed" },
    source: { type: String, default: "footer", maxlength: 40 },
    unsubscribeTokenHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);
export interface SubscriberDoc {
  _id: Id;
  email: string;
  status: "subscribed" | "unsubscribed";
  source: string;
  unsubscribeTokenHash: string;
  createdAt: Date;
}
export const NewsletterSubscriber = getModel<SubscriberDoc>("NewsletterSubscriber", subscriberSchema);

/** Product reviews. Only customers with a fulfilled order containing the product may submit. */
const reviewSchema = defineSchema(
  {
    product: { type: ObjectId, ref: "Product", required: true, index: true },
    user: { type: ObjectId, ref: "User", required: true },
    order: { type: ObjectId, ref: "Order", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120, default: "" },
    body: { type: String, trim: true, required: true, maxlength: 2000 },
    authorName: { type: String, required: true, maxlength: 80 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    moderatedBy: { type: ObjectId, ref: "User", default: null },
    moderatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
reviewSchema.index({ user: 1, product: 1 }, { unique: true });
export interface ReviewDoc {
  _id: Id;
  product: Id;
  user: Id;
  order: Id;
  rating: number;
  title: string;
  body: string;
  authorName: string;
  status: "pending" | "approved" | "rejected";
  moderatedBy: Id | null;
  moderatedAt: Date | null;
  createdAt: Date;
}
export const Review = getModel<ReviewDoc>("Review", reviewSchema);
