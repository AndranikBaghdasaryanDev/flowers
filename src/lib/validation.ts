/**
 * Validation schemas shared by forms (client) and API routes (server).
 * Objects strip unknown keys, which also protects against mass assignment.
 * Monetary inputs are in MAJOR currency units; the server converts to minor units.
 * Error messages are dictionary keys (`server.validation.*`), translated when the API responds.
 */
import { z } from "zod";
import { SLUG_PATTERN, isReservedSlug } from "@/lib/domain/slug";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, VEHICLE_TYPES } from "@/lib/domain/orders";
import { STAFF_ROLES } from "@/lib/domain/roles";
import { isDateKey } from "@/lib/domain/time";

const trimmed = (max: number) => z.string().trim().max(max, "server.validation.tooLong");
const optionalText = (max: number) => trimmed(max).optional().default("");

/**
 * Armenian / Russian overrides of a record's text fields. English lives in the base fields;
 * an empty or missing override falls back to it. Omitting `i18n` leaves stored translations as they are.
 */
const localized = <S extends z.ZodRawShape>(shape: S) => {
  const block = z.object(shape).partial();
  return z.object({ hy: block.optional(), ru: block.optional() }).optional();
};
const textList = (max: number, items: number) => z.array(trimmed(max)).max(items);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "server.validation.emailTooLong")
  .pipe(z.email("server.validation.email"));

export const passwordSchema = z
  .string()
  .min(8, "server.validation.passwordMin")
  .max(128, "server.validation.passwordMax")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "server.validation.passwordLetterNumber");

export const phoneSchema = z
  .string()
  .trim()
  .max(32, "server.validation.phoneTooLong")
  .refine((v) => /^\+?[\d\s\-().]{7,24}$/.test(v) && (v.match(/\d/g)?.length ?? 0) >= 7, "server.validation.phone");

export const personNameSchema = trimmed(120).min(2, "server.validation.fullName");

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "server.validation.identifier");

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "server.validation.slugMin")
  .max(80, "server.validation.slugTooLong")
  .regex(SLUG_PATTERN, "server.validation.slugPattern")
  .refine((v) => !isReservedSlug(v), "server.validation.slugReserved");

export const moneySchema = z.coerce
  .number({ error: "server.validation.amountRequired" })
  .min(0, "server.validation.amountNegative")
  .max(100_000_000, "server.validation.amountTooLarge");

/* ----------------------------- Auth & account ----------------------------- */

export const registerSchema = z
  .object({
    name: personNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { error: "server.validation.acceptTermsAccount" }),
    marketingOptIn: z.boolean().optional().default(false),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "server.validation.passwordsMismatch" });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "server.validation.enterPassword").max(128),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(128),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "server.validation.passwordsMismatch" });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "server.validation.enterCurrentPassword").max(128),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "server.validation.passwordsMismatch" });

export const profileSchema = z.object({
  name: personNameSchema,
  phone: z.union([phoneSchema, z.literal("")]).optional().default(""),
  marketingOptIn: z.boolean().optional().default(false),
});

export const addressSchema = z.object({
  label: optionalText(40),
  recipientName: personNameSchema,
  phone: phoneSchema,
  city: trimmed(80).min(2, "server.validation.city"),
  zone: optionalText(80),
  street: trimmed(160).min(2, "server.validation.street"),
  building: optionalText(40),
  apartment: optionalText(40),
  entrance: optionalText(20),
  floor: optionalText(20),
  notes: optionalText(300),
  isDefault: z.boolean().optional().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;

/* --------------------------------- Cart ---------------------------------- */

export const cartLineSchema = z.object({
  productId: objectIdSchema,
  quantity: z.coerce.number().int().min(1).max(99),
});

export const cartSchema = z.object({
  items: z.array(cartLineSchema).max(50, "server.validation.cartTooLarge"),
  giftMessage: optionalText(500),
});

export const quoteSchema = z.object({
  items: z.array(cartLineSchema).max(50),
  deliveryMethodId: objectIdSchema.optional(),
  zone: optionalText(80),
});

/* ------------------------------- Checkout -------------------------------- */

export const checkoutAddressSchema = z.object({
  city: trimmed(80).min(2, "server.validation.city"),
  zone: optionalText(80),
  street: trimmed(160).min(2, "server.validation.street"),
  building: optionalText(40),
  apartment: optionalText(40),
  entrance: optionalText(20),
  floor: optionalText(20),
  notes: optionalText(300),
});

export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(16).max(64).regex(/^[A-Za-z0-9_-]+$/),
  items: z.array(cartLineSchema).min(1, "server.validation.cartEmpty").max(50),
  customer: z.object({
    name: personNameSchema,
    email: emailSchema,
    phone: phoneSchema,
  }),
  recipient: z
    .object({
      name: z.union([personNameSchema, z.literal("")]).optional().default(""),
      phone: z.union([phoneSchema, z.literal("")]).optional().default(""),
    })
    .optional()
    .default({ name: "", phone: "" }),
  deliveryMethodId: objectIdSchema,
  address: checkoutAddressSchema.nullable().optional(),
  deliveryDate: z.string().refine(isDateKey, "server.validation.date"),
  timeWindow: z.string().max(40).optional().default(""),
  paymentMethod: z.enum(PAYMENT_METHODS, { error: "server.validation.paymentMethod" }),
  giftMessage: optionalText(500),
  customerComment: optionalText(1000),
  /** Total the customer saw (minor units). If prices changed meanwhile, the order is not placed. */
  expectedTotal: z.number().int().min(0).optional(),
  acceptTerms: z.literal(true, { error: "server.validation.acceptTerms" }),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const trackLookupSchema = z.object({
  orderNumber: trimmed(32).min(3, "server.validation.orderNumber"),
  email: emailSchema,
});

/* ------------------------------ Admin: catalog ---------------------------- */

export const categoryInputSchema = z.object({
  name: trimmed(80).min(2, "server.validation.name"),
  slug: slugSchema,
  kind: z.enum(["collection", "occasion"]),
  description: optionalText(1000),
  image: objectIdSchema.nullable().optional().default(null),
  imageAlt: optionalText(200),
  sortOrder: z.coerce.number().int().min(-10000).max(10000).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  seoTitle: optionalText(120),
  seoDescription: optionalText(300),
  i18n: localized({
    name: trimmed(80),
    description: trimmed(1000),
    imageAlt: trimmed(200),
    seoTitle: trimmed(120),
    seoDescription: trimmed(300),
  }),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const productImageInputSchema = z.object({
  media: objectIdSchema,
  alt: trimmed(300).min(3, "server.validation.imageAlt"),
});

export const productInputSchema = z
  .object({
    name: trimmed(120).min(2, "server.validation.productName"),
    slug: slugSchema,
    shortDescription: optionalText(240),
    description: optionalText(5000),
    price: moneySchema,
    compareAtPrice: moneySchema.nullable().optional().default(null),
    category: objectIdSchema,
    occasions: z.array(objectIdSchema).max(20).default([]),
    images: z.array(productImageInputSchema).max(12, "server.validation.maxImages").default([]),
    composition: z.array(trimmed(60).min(1)).max(30).default([]),
    colors: z.array(trimmed(40).min(1)).max(12).default([]),
    sizeLabel: optionalText(60),
    dimensions: optionalText(80),
    careInstructions: optionalText(2000),
    availability: z.enum(["available", "unavailable"]),
    trackInventory: z.boolean().default(false),
    stockQuantity: z.coerce.number().int().min(0).max(100000).nullable().optional().default(null),
    maxPerOrder: z.coerce.number().int().min(1).max(99).nullable().optional().default(null),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    allowGiftMessage: z.boolean().default(true),
    seoTitle: optionalText(120),
    seoDescription: optionalText(300),
    i18n: localized({
      name: trimmed(120),
      shortDescription: trimmed(240),
      description: trimmed(5000),
      careInstructions: trimmed(2000),
      sizeLabel: trimmed(60),
      dimensions: trimmed(80),
      seoTitle: trimmed(120),
      seoDescription: trimmed(300),
      composition: textList(60, 30),
      colors: textList(40, 12),
      /** Alt texts aligned with `images` by position. */
      imageAlts: textList(300, 12),
    }),
  })
  .superRefine((d, ctx) => {
    if (d.compareAtPrice !== null && d.compareAtPrice !== undefined && d.compareAtPrice <= d.price) {
      ctx.addIssue({ code: "custom", path: ["compareAtPrice"], message: "server.validation.compareAtPrice" });
    }
    if (d.trackInventory && (d.stockQuantity === null || d.stockQuantity === undefined)) {
      ctx.addIssue({ code: "custom", path: ["stockQuantity"], message: "server.validation.stockRequired" });
    }
    if (d.isActive && d.images.length === 0) {
      ctx.addIssue({ code: "custom", path: ["images"], message: "server.validation.imageRequired" });
    }
  });
export type ProductInput = z.infer<typeof productInputSchema>;

export const productPatchSchema = z.object({
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  availability: z.enum(["available", "unavailable"]).optional(),
  stockQuantity: z.coerce.number().int().min(0).max(100000).optional(),
});

/* ---------------------------- Admin: orders ------------------------------ */

export const statusChangeSchema = z.object({
  to: z.enum(ORDER_STATUSES),
  expectedVersion: z.number().int().min(0),
  note: optionalText(1000),
  message: optionalText(1000),
  reason: optionalText(500),
});

export const paymentChangeSchema = z.object({
  to: z.enum(PAYMENT_STATUSES),
  expectedVersion: z.number().int().min(0),
  note: optionalText(1000),
});

export const deliveryAssignSchema = z.object({
  expectedVersion: z.number().int().min(0),
  courierId: objectIdSchema.nullable(),
  vehicleType: z.enum(VEHICLE_TYPES).nullable().optional().default(null),
  vehicleModel: optionalText(80),
  vehicleRegistration: optionalText(20),
  instructions: optionalText(500),
  note: optionalText(1000),
});

export const orderNoteSchema = z.object({
  kind: z.enum(["internal", "customer"]),
  body: trimmed(1000).min(1, "server.validation.writeNote"),
});

export const orderListQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.string().max(200).optional(),
  payment: z.enum(PAYMENT_STATUSES).optional(),
  fulfillment: z.enum(["delivery", "pickup"]).optional(),
  range: z.enum(["today", "yesterday", "7d", "30d", "custom", "all"]).optional(),
  from: z.string().refine(isDateKey).optional(),
  to: z.string().refine(isDateKey).optional(),
  dateField: z.enum(["created", "delivery"]).optional(),
  sort: z.enum(["newest", "oldest", "total_desc", "total_asc", "delivery_date"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).optional(),
  courier: objectIdSchema.optional(),
});

/* --------------------------- Admin: delivery ----------------------------- */

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "server.validation.timeFormat");

export const deliveryMethodInputSchema = z
  .object({
    name: trimmed(80).min(2, "server.validation.name"),
    type: z.enum(["delivery", "pickup"]),
    description: optionalText(500),
    isActive: z.boolean().default(true),
    fee: moneySchema.default(0),
    freeOverAmount: moneySchema.nullable().optional().default(null),
    minOrderAmount: moneySchema.default(0),
    zones: z
      .array(z.object({ name: trimmed(80).min(1), fee: moneySchema.nullable().optional().default(null) }))
      .max(100)
      .default([]),
    city: optionalText(80),
    estimatedTime: optionalText(120),
    leadTimeMinutes: z.coerce.number().int().min(0).max(20160).default(120),
    maxDaysAhead: z.coerce.number().int().min(0).max(365).default(30),
    availableWeekdays: z.array(z.number().int().min(0).max(6)).min(1, "server.validation.chooseDay").max(7),
    timeWindows: z
      .array(z.object({ label: trimmed(40).min(1), start: timeSchema, end: timeSchema }))
      .max(24)
      .default([]),
    requiresCourier: z.boolean().default(false),
    pickupAddress: optionalText(300),
    sortOrder: z.coerce.number().int().min(-1000).max(1000).default(0),
    i18n: localized({
      name: trimmed(80),
      description: trimmed(500),
      city: trimmed(80),
      estimatedTime: trimmed(120),
      pickupAddress: trimmed(300),
      /** Area names aligned with `zones` by position. */
      zones: textList(80, 100),
    }),
  })
  .superRefine((d, ctx) => {
    d.timeWindows.forEach((w, i) => {
      if (w.start >= w.end) ctx.addIssue({ code: "custom", path: ["timeWindows", i, "end"], message: "server.validation.endAfterStart" });
    });
    if (d.type === "pickup" && d.requiresCourier) {
      ctx.addIssue({ code: "custom", path: ["requiresCourier"], message: "server.validation.pickupNoCourier" });
    }
  });
export type DeliveryMethodInput = z.infer<typeof deliveryMethodInputSchema>;

export const courierInputSchema = z.object({
  name: personNameSchema,
  phone: z.union([phoneSchema, z.literal("")]).optional().default(""),
  vehicleType: z.enum(VEHICLE_TYPES),
  vehicleModel: optionalText(80),
  vehicleRegistration: optionalText(20),
  notes: optionalText(500),
  isActive: z.boolean().default(true),
});

/* --------------------------- Admin: settings ----------------------------- */

const urlOrEmpty = z.union([z.literal(""), z.url("server.validation.url").max(500)]);

export const settingsInputSchema = z.object({
  storeName: trimmed(80).min(2),
  tagline: optionalText(160),
  timeZone: z.string().max(64),
  contact: z.object({
    phone: z.union([phoneSchema, z.literal("")]).default(""),
    email: z.union([emailSchema, z.literal("")]).default(""),
    whatsapp: z.union([phoneSchema, z.literal("")]).default(""),
    address: optionalText(300),
    hours: optionalText(300),
    mapUrl: urlOrEmpty.default(""),
  }),
  social: z.object({
    instagram: urlOrEmpty.default(""),
    facebook: urlOrEmpty.default(""),
    telegram: urlOrEmpty.default(""),
  }),
  checkout: z
    .object({
      guestCheckout: z.boolean(),
      allowCustomerCancel: z.boolean(),
      cashOnDelivery: z.boolean(),
      cashOnPickup: z.boolean(),
      maxQuantityPerItem: z.coerce.number().int().min(1).max(99),
      orderNotice: optionalText(500),
    })
    .refine((c) => c.cashOnDelivery || c.cashOnPickup, {
      path: ["cashOnDelivery"],
      message: "server.validation.enablePayment",
    }),
  i18n: localized({
    tagline: trimmed(160),
    contactAddress: trimmed(300),
    contactHours: trimmed(300),
    orderNotice: trimmed(500),
  }),
});

export const contentInputSchema = z.object({
  announcement: optionalText(160),
  heroEyebrow: optionalText(80),
  heroTitle: optionalText(120),
  heroSubtitle: optionalText(300),
  heroImage: objectIdSchema.nullable().default(null),
  heroImageAlt: optionalText(200),
  storyTitle: optionalText(120),
  storyBody: optionalText(3000),
  storyImage: objectIdSchema.nullable().default(null),
  storyImageAlt: optionalText(200),
  aboutBody: optionalText(6000),
  deliveryInfo: optionalText(3000),
  i18n: localized({
    announcement: trimmed(160),
    heroEyebrow: trimmed(80),
    heroTitle: trimmed(120),
    heroSubtitle: trimmed(300),
    heroImageAlt: trimmed(200),
    storyTitle: trimmed(120),
    storyBody: trimmed(3000),
    storyImageAlt: trimmed(200),
    aboutBody: trimmed(6000),
    deliveryInfo: trimmed(3000),
  }),
});

export const legalInputSchema = z.object({
  privacy: optionalText(20000),
  terms: optionalText(20000),
  returns: optionalText(20000),
  markReviewed: z.boolean().optional().default(false),
  i18n: localized({ privacy: trimmed(20000), terms: trimmed(20000), returns: trimmed(20000) }),
});

export const galleryInputSchema = z.object({
  image: objectIdSchema,
  alt: trimmed(200).min(3, "server.validation.describeImage"),
  caption: optionalText(200),
  link: z.union([z.literal(""), z.url().max(300)]).default(""),
  sortOrder: z.coerce.number().int().min(-1000).max(1000).default(0),
  isActive: z.boolean().default(true),
  i18n: localized({ alt: trimmed(200), caption: trimmed(200) }),
});

export const staffInputSchema = z.object({
  email: emailSchema,
  name: personNameSchema,
  role: z.enum(STAFF_ROLES),
  password: passwordSchema.optional(),
});

export const staffRoleSchema = z.object({
  role: z.enum([...STAFF_ROLES, "customer"] as const),
  status: z.enum(["active", "disabled"]).optional(),
});

/* ------------------------------ Engagement ------------------------------- */

export const newsletterSchema = z.object({ email: emailSchema, source: z.string().max(40).optional().default("footer") });

export const reviewInputSchema = z.object({
  productId: objectIdSchema,
  rating: z.coerce.number().int().min(1, "server.validation.chooseRating").max(5),
  title: optionalText(120),
  body: trimmed(2000).min(10, "server.validation.reviewBody"),
});

export const reviewModerationSchema = z.object({ status: z.enum(["approved", "rejected", "pending"]) });

export const analyticsQuerySchema = z.object({
  range: z.enum(["today", "yesterday", "7d", "30d", "this_month", "last_month", "custom"]).optional(),
  from: z.string().refine(isDateKey).optional(),
  to: z.string().refine(isDateKey).optional(),
});
