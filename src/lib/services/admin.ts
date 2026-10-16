import "server-only";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDb } from "@/lib/db";
import { Courier, DeliveryMethod, type DeliveryMethodDoc } from "@/lib/models/delivery";
import { GalleryItem, NewsletterSubscriber, Review, Settings } from "@/lib/models/content";
import { AuditLog } from "@/lib/models/system";
import { Order, type OrderDoc } from "@/lib/models/order";
import { Category, Product } from "@/lib/models/catalog";
import { User } from "@/lib/models/user";
import { ApiError } from "@/lib/api/errors";
import type { SessionUser } from "@/lib/auth/session";
import { destroyAllSessions } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/tokens";
import { audit } from "@/lib/services/audit";
import { deliveryMethodToDto } from "@/lib/services/delivery";
import { loadSettings } from "@/lib/services/settings";
import { cleanupOrphanMedia } from "@/lib/services/admin-catalog";
import { mediaInfoMap } from "@/lib/services/media";
import { isEmailConfigured } from "@/lib/services/email";
import { toMajor, toMinor } from "@/lib/domain/money";
import { isValidTimeZone, toDateKey, zonedDayRange } from "@/lib/domain/time";
import { OPEN_STATUSES, type VehicleType } from "@/lib/domain/orders";
import { isStaffRole, type Role, type StaffRole } from "@/lib/domain/roles";
import type {
  contentInputSchema,
  courierInputSchema,
  deliveryMethodInputSchema,
  galleryInputSchema,
  legalInputSchema,
  settingsInputSchema,
} from "@/lib/validation";
import type { DeliveryMethodDTO, ImageDTO, Paginated } from "@/lib/types";

const rx = (q: string) => new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

/* ----------------------------- Delivery methods ---------------------------- */

export type AdminDeliveryMethod = DeliveryMethodDTO & { isActive: boolean; sortOrder: number; orderCount: number };

/** Methods with money converted to MAJOR units for the edit form. */
export async function listAdminDeliveryMethods(): Promise<AdminDeliveryMethod[]> {
  await connectDb();
  const settings = await loadSettings();
  const docs = await DeliveryMethod.find().sort({ sortOrder: 1, name: 1 }).lean<DeliveryMethodDoc[]>();
  const counts = await Order.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
    { $group: { _id: "$fulfillment.method", n: { $sum: 1 } } },
  ]);
  const n = new Map(counts.map((c) => [String(c._id), c.n]));
  const major = (v: number | null) => (v === null ? null : toMajor(v, settings.currency));
  return docs.map((d) => {
    const dto = deliveryMethodToDto(d);
    return {
      ...dto,
      fee: toMajor(dto.fee, settings.currency),
      freeOverAmount: major(dto.freeOverAmount),
      minOrderAmount: toMajor(dto.minOrderAmount, settings.currency),
      zones: dto.zones.map((z) => ({ name: z.name, fee: major(z.fee) })),
      isActive: d.isActive,
      sortOrder: d.sortOrder ?? 0,
      orderCount: n.get(String(d._id)) ?? 0,
    };
  });
}

export async function saveDeliveryMethod(input: z.infer<typeof deliveryMethodInputSchema>, user: SessionUser, id?: string) {
  await connectDb();
  const settings = await loadSettings();
  const minor = (v: number | null | undefined) => (v === null || v === undefined ? null : toMinor(v, settings.currency));
  const seen = new Set<string>();
  for (const z of input.zones) {
    const key = z.name.toLowerCase();
    if (seen.has(key)) throw ApiError.validation(`The area “${z.name}” is listed twice.`);
    seen.add(key);
  }
  const payload = {
    ...input,
    fee: toMinor(input.fee, settings.currency),
    freeOverAmount: minor(input.freeOverAmount),
    minOrderAmount: toMinor(input.minOrderAmount, settings.currency),
    zones: input.zones.map((z) => ({ name: z.name, fee: minor(z.fee) })),
    availableWeekdays: [...new Set(input.availableWeekdays)].sort(),
  };
  if (id) {
    const res = await DeliveryMethod.updateOne({ _id: id }, { $set: payload });
    if (res.matchedCount === 0) throw ApiError.notFound("Delivery method not found.");
  } else {
    const doc = await DeliveryMethod.create(payload);
    id = String(doc._id);
  }
  await audit({ actor: user, action: "delivery_method.save", entityType: "delivery_method", entityId: id, summary: `Saved delivery method “${input.name}”` });
  return id;
}

export async function deleteDeliveryMethod(id: string, user: SessionUser) {
  await connectDb();
  const doc = await DeliveryMethod.findById(id).lean();
  if (!doc) throw ApiError.notFound("Delivery method not found.");
  const used = await Order.exists({ "fulfillment.method": id });
  if (used) {
    // Orders keep a snapshot of the method name; the method is deactivated instead of removed.
    await DeliveryMethod.updateOne({ _id: id }, { $set: { isActive: false } });
    await audit({ actor: user, action: "delivery_method.deactivate", entityType: "delivery_method", entityId: id, summary: `Deactivated “${doc.name}” (used by orders)` });
    return "deactivated" as const;
  }
  await DeliveryMethod.deleteOne({ _id: id });
  await audit({ actor: user, action: "delivery_method.delete", entityType: "delivery_method", entityId: id, summary: `Deleted delivery method “${doc.name}”` });
  return "deleted" as const;
}

/* --------------------------------- Couriers -------------------------------- */

export type CourierDTO = {
  id: string;
  name: string;
  phone: string;
  vehicleType: VehicleType;
  vehicleModel: string;
  vehicleRegistration: string;
  notes: string;
  isActive: boolean;
  activeDeliveries: number;
};

export async function listCouriers(includeInactive = true): Promise<CourierDTO[]> {
  await connectDb();
  const docs = await Courier.find(includeInactive ? {} : { isActive: true }).sort({ isActive: -1, name: 1 }).lean();
  const counts = await Order.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
    { $match: { status: { $in: ["ready", "out_for_delivery", "delivery_failed"] }, "delivery.courier": { $ne: null } } },
    { $group: { _id: "$delivery.courier", n: { $sum: 1 } } },
  ]);
  const n = new Map(counts.map((c) => [String(c._id), c.n]));
  return docs.map((c) => ({
    id: String(c._id),
    name: c.name,
    phone: c.phone ?? "",
    vehicleType: c.vehicleType as VehicleType,
    vehicleModel: c.vehicleModel ?? "",
    vehicleRegistration: c.vehicleRegistration ?? "",
    notes: c.notes ?? "",
    isActive: c.isActive,
    activeDeliveries: n.get(String(c._id)) ?? 0,
  }));
}

export async function saveCourier(input: z.infer<typeof courierInputSchema>, user: SessionUser, id?: string) {
  await connectDb();
  const payload = { ...input, vehicleRegistration: input.vehicleRegistration.toUpperCase() };
  if (id) {
    const res = await Courier.updateOne({ _id: id }, { $set: payload });
    if (res.matchedCount === 0) throw ApiError.notFound("Courier not found.");
  } else {
    id = String((await Courier.create(payload))._id);
  }
  await audit({ actor: user, action: "courier.save", entityType: "courier", entityId: id, summary: `Saved courier “${input.name}”` });
  return id;
}

/* -------------------------------- Customers -------------------------------- */

export type CustomerListItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  orderCount: number;
  orderValue: number;
  lastOrderAt: string | null;
};

export async function listCustomers(q: string | undefined, page = 1): Promise<Paginated<CustomerListItem>> {
  await connectDb();
  const pageSize = 20;
  const filter: Record<string, unknown> = { role: "customer" };
  if (q) filter.$or = [{ name: rx(q) }, { email: rx(q) }, { phone: rx(q) }];
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).select("name email phone status createdAt").lean(),
    User.countDocuments(filter),
  ]);
  const stats = await Order.aggregate<{ _id: mongoose.Types.ObjectId; n: number; value: number; last: Date }>([
    { $match: { user: { $in: users.map((u) => u._id) }, status: { $ne: "cancelled" } } },
    { $group: { _id: "$user", n: { $sum: 1 }, value: { $sum: "$total" }, last: { $max: "$createdAt" } } },
  ]);
  const s = new Map(stats.map((r) => [String(r._id), r]));
  return {
    items: users.map((u) => {
      const st = s.get(String(u._id));
      return {
        id: String(u._id),
        name: u.name,
        email: u.email,
        phone: u.phone ?? "",
        status: u.status,
        createdAt: new Date(u.createdAt).toISOString(),
        orderCount: st?.n ?? 0,
        orderValue: st?.value ?? 0,
        lastOrderAt: st?.last ? new Date(st.last).toISOString() : null,
      };
    }),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getCustomer(id: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDb();
  const user = await User.findOne({ _id: id }).select("name email phone status role createdAt lastLoginAt emailVerifiedAt marketingOptIn addresses").lean();
  if (!user) return null;
  const orders = await Order.find({ user: id }).sort({ createdAt: -1 }).limit(50).lean<OrderDoc[]>();
  const active = orders.filter((o) => o.status !== "cancelled");
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    status: user.status,
    role: user.role as Role,
    createdAt: new Date(user.createdAt).toISOString(),
    lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
    emailVerified: Boolean(user.emailVerifiedAt),
    marketingOptIn: Boolean(user.marketingOptIn),
    addressCount: user.addresses?.length ?? 0,
    orderCount: active.length,
    orderValue: active.reduce((n, o) => n + o.total, 0),
    orders: orders.map((o) => ({
      id: String(o._id),
      orderNumber: o.orderNumber,
      createdAt: new Date(o.createdAt).toISOString(),
      status: o.status,
      fulfillment: o.fulfillment.kind,
      total: o.total,
      paymentStatus: o.paymentStatus,
    })),
  };
}

export async function setCustomerStatus(id: string, status: "active" | "disabled", actor: SessionUser) {
  await connectDb();
  const user = await User.findById(id).select("role name").lean();
  if (!user || user.role !== "customer") throw ApiError.notFound("Customer not found.");
  await User.updateOne({ _id: id }, { $set: { status } });
  if (status === "disabled") await destroyAllSessions(id);
  await audit({ actor, action: "customer.status", entityType: "user", entityId: id, summary: `${status === "disabled" ? "Disabled" : "Enabled"} customer ${user.name}` });
}

/* ---------------------------------- Staff ---------------------------------- */

export async function listStaff() {
  await connectDb();
  const users = await User.find({ role: { $ne: "customer" } }).sort({ role: 1, name: 1 }).select("name email role status lastLoginAt createdAt").lean();
  return users.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role as StaffRole,
    status: u.status,
    lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
  }));
}

/**
 * Adds a staff member. Only owners may call this (staff:manage). If the email belongs to an
 * existing customer, the account is promoted; otherwise a new account with a one-time password is created.
 */
export async function addStaff(input: { email: string; name: string; role: StaffRole; password?: string }, actor: SessionUser) {
  await connectDb();
  if (input.role === "owner" && actor.role !== "owner") throw ApiError.forbidden();
  const existing = await User.findOne({ email: input.email }).select("role").lean();
  let temporaryPassword: string | null = null;
  let id: string;
  if (existing) {
    if (isStaffRole(existing.role)) throw ApiError.conflict("This person is already a staff member.");
    await User.updateOne({ _id: existing._id }, { $set: { role: input.role } });
    id = String(existing._id);
  } else {
    temporaryPassword = input.password ?? `${generateToken(9)}9a`;
    const doc = await User.create({ email: input.email, name: input.name, role: input.role, passwordHash: await hashPassword(temporaryPassword) });
    id = String(doc._id);
  }
  await audit({ actor, action: "staff.add", entityType: "user", entityId: id, summary: `Granted ${input.role} access to ${input.email}` });
  return { id, temporaryPassword: input.password ? null : temporaryPassword };
}

export async function updateStaff(id: string, role: Role, status: "active" | "disabled" | undefined, actor: SessionUser) {
  await connectDb();
  if (id === actor.id) throw ApiError.forbidden("You cannot change your own role or status.");
  const target = await User.findById(id).select("role name").lean();
  if (!target || !isStaffRole(target.role)) throw ApiError.notFound("Staff member not found.");
  if ((target.role === "owner" || role === "owner") && actor.role !== "owner") throw ApiError.forbidden();
  if (target.role === "owner" && (role !== "owner" || status === "disabled")) {
    const owners = await User.countDocuments({ role: "owner", status: "active" });
    if (owners <= 1) throw ApiError.conflict("There must always be at least one active owner.");
  }
  const set: Record<string, unknown> = { role };
  if (status) set.status = status;
  await User.updateOne({ _id: id }, { $set: set });
  await destroyAllSessions(id);
  await audit({ actor, action: "staff.update", entityType: "user", entityId: id, summary: `Changed ${target.name}: role ${target.role} → ${role}${status ? `, ${status}` : ""}` });
}

/* --------------------------------- Reviews --------------------------------- */

export async function listReviewsAdmin(status: string | undefined, page = 1) {
  await connectDb();
  const pageSize = 20;
  const filter: Record<string, unknown> = {};
  if (status && ["pending", "approved", "rejected"].includes(status)) filter.status = status;
  const [docs, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Review.countDocuments(filter),
  ]);
  const products = await Product.find({ _id: { $in: docs.map((d) => d.product) } }).select("name slug").lean();
  const pm = new Map(products.map((p) => [String(p._id), p]));
  return {
    items: docs.map((r) => ({
      id: String(r._id),
      productName: pm.get(String(r.product))?.name ?? "Deleted product",
      productSlug: pm.get(String(r.product))?.slug ?? "",
      rating: r.rating,
      title: r.title ?? "",
      body: r.body,
      authorName: r.authorName,
      status: r.status,
      createdAt: new Date(r.createdAt).toISOString(),
    })),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function moderateReview(id: string, status: "approved" | "rejected" | "pending", actor: SessionUser) {
  await connectDb();
  const res = await Review.updateOne({ _id: id }, { $set: { status, moderatedBy: actor.id, moderatedAt: new Date() } });
  if (res.matchedCount === 0) throw ApiError.notFound("Review not found.");
  await audit({ actor, action: "review.moderate", entityType: "review", entityId: id, summary: `Review ${status}` });
}

/* --------------------------- Settings and content -------------------------- */

export async function updateStoreSettings(input: z.infer<typeof settingsInputSchema>, actor: SessionUser) {
  await connectDb();
  if (!isValidTimeZone(input.timeZone)) throw ApiError.validation("Unknown time zone.", { timeZone: "Unknown time zone." });
  await Settings.updateOne({ _id: "store" }, { $set: input }, { upsert: true });
  await audit({ actor, action: "settings.update", entityType: "settings", entityId: "store", summary: "Updated store settings" });
}

export async function updateContent(input: z.infer<typeof contentInputSchema>, actor: SessionUser) {
  await connectDb();
  const before = await Settings.findById("store").select("content").lean();
  const set = Object.fromEntries(Object.entries(input).map(([k, v]) => [`content.${k}`, v]));
  await Settings.updateOne({ _id: "store" }, { $set: set }, { upsert: true });
  await audit({ actor, action: "content.update", entityType: "settings", entityId: "store", summary: "Updated homepage content" });
  const old = [before?.content?.heroImage, before?.content?.storyImage].filter(Boolean).map(String);
  await cleanupOrphanMedia(old);
}

export async function updateLegal(input: z.infer<typeof legalInputSchema>, actor: SessionUser) {
  await connectDb();
  const set: Record<string, unknown> = { "legal.privacy": input.privacy, "legal.terms": input.terms, "legal.returns": input.returns };
  if (input.markReviewed) set["legal.reviewedAt"] = new Date();
  await Settings.updateOne({ _id: "store" }, { $set: set }, { upsert: true });
  await audit({ actor, action: "legal.update", entityType: "settings", entityId: "store", summary: "Updated legal pages" });
}

export type GalleryItemDTO = { id: string; image: ImageDTO | null; imageId: string; alt: string; caption: string; link: string; sortOrder: number; isActive: boolean; isSample: boolean };

export async function listGallery(activeOnly: boolean): Promise<GalleryItemDTO[]> {
  await connectDb();
  const docs = await GalleryItem.find(activeOnly ? { isActive: true } : {}).sort({ sortOrder: 1, createdAt: -1 }).limit(activeOnly ? 12 : 100).lean();
  const media = await mediaInfoMap(docs.map((d) => d.image));
  return docs.map((d) => {
    const info = media.get(String(d.image));
    return {
      id: String(d._id),
      image: info ? { src: info.url, alt: d.alt, width: info.width, height: info.height } : null,
      imageId: String(d.image),
      alt: d.alt,
      caption: d.caption ?? "",
      link: d.link ?? "",
      sortOrder: d.sortOrder ?? 0,
      isActive: d.isActive,
      isSample: Boolean(d.isSample),
    };
  });
}

export async function saveGalleryItem(input: z.infer<typeof galleryInputSchema>, actor: SessionUser, id?: string) {
  await connectDb();
  if (id) {
    const before = await GalleryItem.findById(id).lean();
    if (!before) throw ApiError.notFound("Gallery item not found.");
    await GalleryItem.updateOne({ _id: id }, { $set: { ...input, isSample: false } });
    if (String(before.image) !== input.image) await cleanupOrphanMedia([String(before.image)]);
  } else {
    id = String((await GalleryItem.create(input))._id);
  }
  await audit({ actor, action: "gallery.save", entityType: "gallery", entityId: id, summary: "Saved gallery image" });
}

export async function deleteGalleryItem(id: string, actor: SessionUser) {
  await connectDb();
  const item = await GalleryItem.findByIdAndDelete(id).lean();
  if (!item) throw ApiError.notFound("Gallery item not found.");
  await cleanupOrphanMedia([String(item.image)]);
  await audit({ actor, action: "gallery.delete", entityType: "gallery", entityId: id, summary: "Deleted gallery image" });
}

/* ---------------------------- Newsletter (admin) --------------------------- */

export async function listSubscribers(page = 1) {
  await connectDb();
  const pageSize = 50;
  const [docs, total] = await Promise.all([
    NewsletterSubscriber.find({ status: "subscribed" }).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    NewsletterSubscriber.countDocuments({ status: "subscribed" }),
  ]);
  return { items: docs.map((d) => ({ id: String(d._id), email: d.email, createdAt: new Date(d.createdAt as Date).toISOString() })), total };
}

/* ------------------------------- Audit log --------------------------------- */

export async function listAudit(page = 1, entity?: string) {
  await connectDb();
  const pageSize = 30;
  const filter: Record<string, unknown> = {};
  if (entity) filter.entityType = entity;
  const [docs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    AuditLog.countDocuments(filter),
  ]);
  return {
    items: docs.map((d) => ({
      id: String(d._id),
      actorName: d.actorName,
      action: d.action,
      entityType: d.entityType,
      entityId: d.entityId ?? "",
      summary: d.summary,
      createdAt: new Date(d.createdAt).toISOString(),
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/* ------------------------------ Dashboard ---------------------------------- */

export async function getDashboardOverview() {
  await connectDb();
  const settings = await loadSettings();
  const today = toDateKey(new Date(), settings.timeZone);
  const { start, end } = zonedDayRange(today, today, settings.timeZone);
  const [byStatus, todayAgg, dueToday, recent, lowStock, pendingReviews, methods, sampleCounts, productCount] = await Promise.all([
    Order.aggregate<{ _id: string; n: number }>([{ $match: { status: { $in: OPEN_STATUSES } } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    Order.aggregate<{ n: number; value: number }>([
      { $match: { createdAt: { $gte: start, $lt: end }, status: { $ne: "cancelled" } } },
      { $group: { _id: null, n: { $sum: 1 }, value: { $sum: "$total" } } },
    ]),
    Order.countDocuments({ deliveryDate: today, status: { $in: OPEN_STATUSES } }),
    Order.find().sort({ createdAt: -1 }).limit(6).lean<OrderDoc[]>(),
    Product.find({ archivedAt: null, isActive: true, trackInventory: true, stockQuantity: { $lte: 3 } }).select("name stockQuantity").limit(8).lean(),
    Review.countDocuments({ status: "pending" }),
    DeliveryMethod.countDocuments({ isActive: true }),
    Promise.all([Product.countDocuments({ isSample: true, archivedAt: null }), Category.countDocuments({ isSample: true })]),
    Product.countDocuments({ archivedAt: null }),
  ]);
  const setup = [
    { key: "contact", label: "Add your phone, email and address", done: Boolean(settings.contact.phone && settings.contact.address), href: "/admin/settings" },
    { key: "delivery", label: "Review delivery methods, fees and areas", done: methods > 0, href: "/admin/delivery/settings" },
    { key: "samples", label: "Replace sample products and categories with real ones", done: sampleCounts[0] + sampleCounts[1] === 0 && productCount > 0, href: "/admin/products" },
    { key: "legal", label: "Review privacy, terms and returns pages", done: Boolean(settings.legal.reviewedAt), href: "/admin/content/legal" },
    { key: "email", label: "Configure SMTP so customers receive emails", done: isEmailConfigured(), href: "/admin/settings" },
  ];
  return {
    today,
    currency: settings.currency,
    timeZone: settings.timeZone,
    openByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.n])) as Record<string, number>,
    todayOrders: todayAgg[0]?.n ?? 0,
    todayValue: todayAgg[0]?.value ?? 0,
    dueToday,
    pendingReviews,
    lowStock: lowStock.map((p) => ({ id: String(p._id), name: p.name, stock: p.stockQuantity ?? 0 })),
    recent: recent.map((o) => ({
      id: String(o._id),
      orderNumber: o.orderNumber,
      customerName: o.customer.name,
      total: o.total,
      status: o.status,
      fulfillment: o.fulfillment.kind,
      createdAt: new Date(o.createdAt).toISOString(),
    })),
    setup,
  };
}
