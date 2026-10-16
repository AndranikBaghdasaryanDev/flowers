import "server-only";
import mongoose from "mongoose";
import { connectDb, withTransaction } from "@/lib/db";
import { Category, Media, Product, type CategoryDoc, type CategoryText, type ProductDoc } from "@/lib/models/catalog";
import type { I18nOverrides } from "@/lib/models/_util";
import { Order } from "@/lib/models/order";
import { GalleryItem, Settings } from "@/lib/models/content";
import { ApiError, msg } from "@/lib/api/errors";
import type { SessionUser } from "@/lib/auth/session";
import { audit } from "@/lib/services/audit";
import { deleteMedia, mediaInfoMap } from "@/lib/services/media";
import { loadSettings } from "@/lib/services/settings";
import { toMajor, toMinor } from "@/lib/domain/money";
import type { CategoryInput, ProductInput } from "@/lib/validation";
import type { ImageDTO, Paginated } from "@/lib/types";

/* -------------------------------- Categories ------------------------------- */

export type AdminCategoryDTO = {
  id: string;
  name: string;
  slug: string;
  kind: "collection" | "occasion";
  description: string;
  image: ImageDTO | null;
  imageId: string | null;
  imageAlt: string;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  seoTitle: string;
  seoDescription: string;
  productCount: number;
  primaryProductCount: number;
  isSample: boolean;
  updatedAt: string;
  /** Stored Armenian / Russian overrides (English is in the base fields). */
  i18n: I18nOverrides<CategoryText>;
};

export async function listAdminCategories(q?: string): Promise<AdminCategoryDTO[]> {
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (q) filter.name = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const cats = await Category.find(filter).sort({ kind: 1, sortOrder: 1, name: 1 }).lean<CategoryDoc[]>();
  const [primary, occasion, media] = await Promise.all([
    Product.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
      { $match: { archivedAt: null } },
      { $group: { _id: "$category", n: { $sum: 1 } } },
    ]),
    Product.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
      { $match: { archivedAt: null } },
      { $unwind: "$occasions" },
      { $group: { _id: "$occasions", n: { $sum: 1 } } },
    ]),
    mediaInfoMap(cats.map((c) => c.image)),
  ]);
  const p = new Map(primary.map((r) => [String(r._id), r.n]));
  const o = new Map(occasion.map((r) => [String(r._id), r.n]));
  return cats.map((c) => {
    const info = c.image ? media.get(String(c.image)) : undefined;
    return {
      id: String(c._id),
      name: c.name,
      slug: c.slug,
      kind: c.kind as AdminCategoryDTO["kind"],
      description: c.description ?? "",
      image: info ? { src: info.url, alt: c.imageAlt || c.name, width: info.width, height: info.height } : null,
      imageId: c.image ? String(c.image) : null,
      imageAlt: c.imageAlt ?? "",
      sortOrder: c.sortOrder ?? 0,
      isActive: c.isActive,
      isFeatured: c.isFeatured,
      seoTitle: c.seoTitle ?? "",
      seoDescription: c.seoDescription ?? "",
      productCount: (p.get(String(c._id)) ?? 0) + (o.get(String(c._id)) ?? 0),
      primaryProductCount: p.get(String(c._id)) ?? 0,
      isSample: Boolean(c.isSample),
      updatedAt: new Date((c as { updatedAt?: Date }).updatedAt ?? Date.now()).toISOString(),
      i18n: c.i18n ?? {},
    };
  });
}

async function assertSlugFree(model: "category" | "product", slug: string, exceptId?: string) {
  const filter: Record<string, unknown> = { slug };
  if (exceptId) filter._id = { $ne: exceptId };
  const exists = model === "category" ? await Category.exists(filter) : await Product.exists(filter);
  if (exists) throw ApiError.validation("server.errors.slugTaken", { slug: "server.errors.slugTakenField" });
}

async function assertMediaExists(ids: (string | null | undefined)[]) {
  const wanted = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  if (wanted.length === 0) return;
  const count = await Media.countDocuments({ _id: { $in: wanted } });
  if (count !== wanted.length) throw ApiError.validation("server.errors.imageMissing");
}

export async function createCategory(input: CategoryInput, user: SessionUser) {
  await connectDb();
  await assertSlugFree("category", input.slug);
  await assertMediaExists([input.image]);
  const doc = await Category.create(input);
  await audit({ actor: user, action: "category.create", entityType: "category", entityId: String(doc._id), summary: `Created category “${doc.name}”` });
  return String(doc._id);
}

export async function updateCategory(id: string, input: CategoryInput, user: SessionUser) {
  await connectDb();
  const existing = await Category.findById(id).lean();
  if (!existing) throw ApiError.notFound("server.notFound.category");
  await assertSlugFree("category", input.slug, id);
  await assertMediaExists([input.image]);
  if (existing.kind !== input.kind) {
    const used =
      existing.kind === "collection"
        ? await Product.exists({ category: id, archivedAt: null })
        : await Product.exists({ occasions: id, archivedAt: null });
    if (used) throw ApiError.conflict("server.errors.categoryKindInUse");
  }
  await Category.updateOne({ _id: id }, { $set: { ...input, isSample: false } });
  await audit({ actor: user, action: "category.update", entityType: "category", entityId: id, summary: `Updated category “${input.name}”` });
}

/**
 * Deletes a category without ever deleting products.
 * Products whose primary category is this one must be reassigned (reassignTo) or deletion is refused.
 * Occasion tags are simply removed from products.
 */
export async function deleteCategory(id: string, reassignTo: string | null, user: SessionUser) {
  await connectDb();
  const cat = await Category.findById(id).lean();
  if (!cat) throw ApiError.notFound("server.notFound.category");
  const primaryCount = await Product.countDocuments({ category: id });
  if (primaryCount > 0) {
    if (!reassignTo) {
      throw ApiError.conflict(
        msg("server.errors.categoryHasProducts", { count: primaryCount }),
        { reason: "has_products", count: primaryCount },
      );
    }
    if (reassignTo === id) throw ApiError.validation("server.errors.chooseDifferentCategory");
    const target = await Category.findOne({ _id: reassignTo, kind: "collection" }).lean();
    if (!target) throw ApiError.validation("server.errors.targetCategoryInvalid");
  }
  await withTransaction(async (session) => {
    if (primaryCount > 0) await Product.updateMany({ category: id }, { $set: { category: reassignTo } }, { session });
    await Product.updateMany({ occasions: id }, { $pull: { occasions: id } }, { session });
    await Category.deleteOne({ _id: id }, { session });
    await audit(
      {
        actor: user,
        action: "category.delete",
        entityType: "category",
        entityId: id,
        summary: `Deleted category “${cat.name}”${primaryCount ? `, moved ${primaryCount} products` : ""}`,
      },
      session,
    );
  });
}

/* --------------------------------- Products -------------------------------- */

export type AdminProductListItem = {
  id: string;
  name: string;
  slug: string;
  image: ImageDTO | null;
  price: number;
  compareAtPrice: number | null;
  categoryName: string;
  availability: "available" | "unavailable";
  trackInventory: boolean;
  stockQuantity: number | null;
  isActive: boolean;
  isFeatured: boolean;
  isArchived: boolean;
  unitsSold: number;
  isSample: boolean;
  updatedAt: string;
};

export async function listAdminProducts(q: {
  q?: string;
  category?: string;
  status?: string;
  availability?: string;
  page?: number;
}): Promise<Paginated<AdminProductListItem>> {
  await connectDb();
  const pageSize = 20;
  const page = Math.max(1, q.page ?? 1);
  const filter: Record<string, unknown> = {};
  if (q.status === "archived") filter.archivedAt = { $ne: null };
  else {
    filter.archivedAt = null;
    if (q.status === "active") filter.isActive = true;
    if (q.status === "inactive") filter.isActive = false;
    if (q.status === "featured") filter.isFeatured = true;
  }
  if (q.category && mongoose.isValidObjectId(q.category)) filter.category = q.category;
  if (q.availability === "available") filter.availability = "available";
  if (q.availability === "unavailable") filter.availability = "unavailable";
  if (q.availability === "out_of_stock") {
    filter.trackInventory = true;
    filter.stockQuantity = { $lte: 0 };
  }
  if (q.availability === "low_stock") {
    filter.trackInventory = true;
    filter.stockQuantity = { $gt: 0, $lte: 5 };
  }
  if (q.q) {
    const rx = new RegExp(q.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { slug: rx }, { composition: rx }];
  }
  const [docs, total, cats] = await Promise.all([
    Product.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean<ProductDoc[]>(),
    Product.countDocuments(filter),
    Category.find().select("name").lean(),
  ]);
  const catNames = new Map(cats.map((c) => [String(c._id), c.name]));
  const media = await mediaInfoMap(docs.map((d) => d.images[0]?.media));
  return {
    items: docs.map((d) => {
      const info = d.images[0] ? media.get(String(d.images[0].media)) : undefined;
      return {
        id: String(d._id),
        name: d.name,
        slug: d.slug,
        image: info ? { src: info.url, alt: d.images[0].alt || d.name, width: info.width, height: info.height } : null,
        price: d.price,
        compareAtPrice: d.compareAtPrice ?? null,
        categoryName: catNames.get(String(d.category)) ?? "—",
        availability: d.availability as "available" | "unavailable",
        trackInventory: d.trackInventory,
        stockQuantity: d.stockQuantity ?? null,
        isActive: d.isActive,
        isFeatured: d.isFeatured,
        isArchived: Boolean(d.archivedAt),
        unitsSold: d.unitsSold ?? 0,
        isSample: Boolean(d.isSample),
        updatedAt: new Date(d.updatedAt).toISOString(),
      };
    }),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Product as edited in the admin form (money in major units). */
export type AdminProductForm = Omit<ProductInput, "images"> & {
  id: string;
  images: { media: string; alt: string; src: string; width: number; height: number }[];
  isArchived: boolean;
  isSample: boolean;
};

export async function getAdminProduct(id: string): Promise<AdminProductForm | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDb();
  const settings = await loadSettings();
  const p = await Product.findById(id).lean<ProductDoc>();
  if (!p) return null;
  const media = await mediaInfoMap(p.images.map((i) => i.media));
  return {
    id: String(p._id),
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription ?? "",
    description: p.description ?? "",
    price: toMajor(p.price, settings.currency),
    compareAtPrice: p.compareAtPrice !== null && p.compareAtPrice !== undefined ? toMajor(p.compareAtPrice, settings.currency) : null,
    category: String(p.category),
    occasions: (p.occasions ?? []).map(String),
    images: p.images
      .map((i) => {
        const info = media.get(String(i.media));
        return info ? { media: String(i.media), alt: i.alt ?? "", src: info.url, width: info.width, height: info.height } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
    composition: p.composition ?? [],
    colors: p.colors ?? [],
    sizeLabel: p.sizeLabel ?? "",
    dimensions: p.dimensions ?? "",
    careInstructions: p.careInstructions ?? "",
    availability: p.availability as "available" | "unavailable",
    trackInventory: p.trackInventory,
    stockQuantity: p.stockQuantity ?? null,
    maxPerOrder: p.maxPerOrder ?? null,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    allowGiftMessage: p.allowGiftMessage ?? true,
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
    isArchived: Boolean(p.archivedAt),
    isSample: Boolean(p.isSample),
    i18n: p.i18n ?? {},
  };
}

async function productPayload(input: ProductInput) {
  const settings = await loadSettings();
  const category = await Category.findById(input.category).lean();
  if (!category || category.kind !== "collection") {
    throw ApiError.validation("server.errors.chooseMainCategory", { category: "server.errors.chooseCollectionCategory" });
  }
  if (input.occasions.length) {
    const n = await Category.countDocuments({ _id: { $in: input.occasions }, kind: "occasion" });
    if (n !== new Set(input.occasions).size) throw ApiError.validation("server.errors.occasionMissing", { occasions: "server.errors.invalidOccasion" });
  }
  await assertMediaExists(input.images.map((i) => i.media));
  return {
    ...input,
    occasions: [...new Set(input.occasions)],
    price: toMinor(input.price, settings.currency),
    compareAtPrice: input.compareAtPrice !== null && input.compareAtPrice !== undefined ? toMinor(input.compareAtPrice, settings.currency) : null,
    stockQuantity: input.trackInventory ? (input.stockQuantity ?? 0) : null,
    composition: [...new Set(input.composition.map((s) => s.trim()).filter(Boolean))],
    colors: [...new Set(input.colors.map((s) => s.trim()).filter(Boolean))],
  };
}

export async function createProduct(input: ProductInput, user: SessionUser) {
  await connectDb();
  await assertSlugFree("product", input.slug);
  const doc = await Product.create(await productPayload(input));
  await audit({ actor: user, action: "product.create", entityType: "product", entityId: String(doc._id), summary: `Created product “${doc.name}”` });
  return String(doc._id);
}

export async function updateProduct(id: string, input: ProductInput, user: SessionUser) {
  await connectDb();
  const existing = await Product.findById(id).lean<ProductDoc>();
  if (!existing) throw ApiError.notFound("server.notFound.product");
  await assertSlugFree("product", input.slug, id);
  const payload = await productPayload(input);
  await Product.updateOne({ _id: id }, { $set: { ...payload, isSample: false } });
  const changes: string[] = [];
  if (existing.price !== payload.price) changes.push(`price ${existing.price} → ${payload.price}`);
  if (existing.isActive !== payload.isActive) changes.push(payload.isActive ? "activated" : "deactivated");
  await audit({
    actor: user,
    action: "product.update",
    entityType: "product",
    entityId: id,
    summary: `Updated product “${payload.name}”${changes.length ? ` (${changes.join(", ")})` : ""}`,
  });
  await cleanupOrphanMedia(existing.images.map((i) => String(i.media)));
}

export async function patchProduct(
  id: string,
  patch: { isActive?: boolean; isFeatured?: boolean; availability?: "available" | "unavailable"; stockQuantity?: number },
  user: SessionUser,
) {
  await connectDb();
  const existing = await Product.findById(id).lean<ProductDoc>();
  if (!existing || existing.archivedAt) throw ApiError.notFound("server.notFound.product");
  if (patch.isActive && existing.images.length === 0) throw ApiError.validation("server.errors.addImageBeforePublishing");
  const set: Record<string, unknown> = {};
  if (patch.isActive !== undefined) set.isActive = patch.isActive;
  if (patch.isFeatured !== undefined) set.isFeatured = patch.isFeatured;
  if (patch.availability) set.availability = patch.availability;
  if (patch.stockQuantity !== undefined) {
    if (!existing.trackInventory) throw ApiError.validation("server.errors.inventoryOff");
    set.stockQuantity = patch.stockQuantity;
  }
  await Product.updateOne({ _id: id }, { $set: set });
  await audit({ actor: user, action: "product.patch", entityType: "product", entityId: id, summary: `Updated “${existing.name}”: ${Object.keys(set).join(", ")}` });
}

/**
 * Removes a product from the catalogue. Products that appear in any order are archived
 * (soft-deleted) so historical orders stay intact; others are deleted permanently.
 */
export async function deleteProduct(id: string, user: SessionUser): Promise<"archived" | "deleted"> {
  await connectDb();
  const product = await Product.findById(id).lean<ProductDoc>();
  if (!product) throw ApiError.notFound("server.notFound.product");
  const inOrders = await Order.exists({ "items.product": product._id });
  if (inOrders) {
    await Product.updateOne({ _id: id }, { $set: { archivedAt: new Date(), isActive: false, isFeatured: false } });
    await audit({ actor: user, action: "product.archive", entityType: "product", entityId: id, summary: `Archived “${product.name}” (has order history)` });
    return "archived";
  }
  await Product.deleteOne({ _id: id });
  await audit({ actor: user, action: "product.delete", entityType: "product", entityId: id, summary: `Deleted “${product.name}”` });
  await cleanupOrphanMedia(product.images.map((i) => String(i.media)));
  return "deleted";
}

export async function restoreProduct(id: string, user: SessionUser) {
  await connectDb();
  const product = await Product.findOneAndUpdate({ _id: id, archivedAt: { $ne: null } }, { $set: { archivedAt: null, isActive: false } }).lean();
  if (!product) throw ApiError.notFound("server.notFound.archivedProduct");
  await audit({ actor: user, action: "product.restore", entityType: "product", entityId: id, summary: `Restored “${product.name}” as inactive` });
}

/** Deletes media files that are no longer referenced anywhere (products, categories, content, gallery, orders). */
export async function cleanupOrphanMedia(candidateIds: string[]) {
  for (const mid of [...new Set(candidateIds)]) {
    if (!mongoose.isValidObjectId(mid)) continue;
    const used =
      (await Product.exists({ "images.media": mid })) ||
      (await Category.exists({ image: mid })) ||
      (await GalleryItem.exists({ image: mid })) ||
      (await Settings.exists({ $or: [{ "content.heroImage": mid }, { "content.storyImage": mid }] })) ||
      (await Order.exists({ "items.image": mid }));
    if (!used) await deleteMedia(mid);
  }
}
