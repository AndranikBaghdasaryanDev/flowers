import "server-only";
import mongoose, { type PipelineStage } from "mongoose";
import { connectDb } from "@/lib/db";
import { Category, Product, type CategoryDoc, type ProductDoc } from "@/lib/models/catalog";
import { Order } from "@/lib/models/order";
import { mediaInfoMap, type MediaInfo } from "@/lib/services/media";
import { getSettings, type StoreSettings } from "@/lib/services/settings";
import { toMinor } from "@/lib/domain/money";
import { overridesFor, pickAt, pickList, pickText } from "@/lib/localize";
import type { Locale } from "@/i18n/config";
import type {
  CategoryDTO,
  CategoryRef,
  ImageDTO,
  Paginated,
  ProductBadge,
  ProductCardDTO,
  ProductDetailDTO,
} from "@/lib/types";

const NEW_PRODUCT_DAYS = 21;
const BESTSELLER_WINDOW_DAYS = 90;
const BESTSELLER_MIN_UNITS = 3;
const BESTSELLER_LIMIT = 8;
export const SHOP_PAGE_SIZE = 12;

/* ------------------------------ Availability ------------------------------ */

type AvailabilityFields = Pick<ProductDoc, "isActive" | "archivedAt" | "availability" | "trackInventory" | "stockQuantity" | "maxPerOrder">;

export function isPurchasable(p: AvailabilityFields, categoryActive = true): boolean {
  if (!p.isActive || p.archivedAt || p.availability !== "available" || !categoryActive) return false;
  if (p.trackInventory) return (p.stockQuantity ?? 0) > 0;
  return true;
}

export function maxQuantityFor(p: AvailabilityFields, settings: Pick<StoreSettings, "checkout">): number {
  let max = settings.checkout.maxQuantityPerItem;
  if (p.maxPerOrder) max = Math.min(max, p.maxPerOrder);
  if (p.trackInventory) max = Math.min(max, Math.max(0, p.stockQuantity ?? 0));
  return max;
}

/* -------------------------------- Helpers -------------------------------- */

function toImage(info: MediaInfo | undefined, alt: string): ImageDTO | null {
  return info ? { src: info.url, alt, width: info.width, height: info.height } : null;
}

const bestsellerCache: { at: number; ids: Set<string> } = { at: 0, ids: new Set() };

/** Products with the most units in non-cancelled orders over the last 90 days (real order data only). */
export async function getBestsellerIds(): Promise<Set<string>> {
  if (Date.now() - bestsellerCache.at < 10 * 60 * 1000) return bestsellerCache.ids;
  await connectDb();
  const since = new Date(Date.now() - BESTSELLER_WINDOW_DAYS * 86400000);
  const rows = await Order.aggregate<{ _id: mongoose.Types.ObjectId; units: number }>([
    { $match: { createdAt: { $gte: since }, status: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.product", units: { $sum: "$items.quantity" } } },
    { $match: { units: { $gte: BESTSELLER_MIN_UNITS } } },
    { $sort: { units: -1 } },
    { $limit: BESTSELLER_LIMIT },
  ]);
  bestsellerCache.at = Date.now();
  bestsellerCache.ids = new Set(rows.map((r) => String(r._id)));
  return bestsellerCache.ids;
}

export function invalidateBestsellers() {
  bestsellerCache.at = 0;
}

type CategoryLookup = Map<string, { ref: CategoryRef; isActive: boolean }>;

async function categoryLookup(locale?: Locale): Promise<CategoryLookup> {
  const cats = await Category.find().select("name slug kind isActive i18n").lean<CategoryDoc[]>();
  return new Map(
    cats.map((c) => [
      String(c._id),
      {
        ref: { id: String(c._id), name: pickText(overridesFor(c.i18n, locale).name, c.name), slug: c.slug, kind: c.kind as CategoryRef["kind"] },
        isActive: c.isActive,
      },
    ]),
  );
}

async function toCards(products: ProductDoc[], settings: StoreSettings, locale?: Locale): Promise<ProductCardDTO[]> {
  const [media, cats, best] = await Promise.all([
    mediaInfoMap(products.flatMap((p) => p.images.slice(0, 2).map((i) => i.media))),
    categoryLookup(locale),
    getBestsellerIds(),
  ]);
  return products.map((p) => cardFromDoc(p, settings, media, cats, best, locale));
}

function cardFromDoc(
  p: ProductDoc,
  settings: StoreSettings,
  media: Map<string, MediaInfo>,
  cats: CategoryLookup,
  best: Set<string>,
  locale?: Locale,
): ProductCardDTO {
  const tr = overridesFor(p.i18n, locale);
  const name = pickText(tr.name, p.name);
  const cat = cats.get(String(p.category));
  const purchasable = isPurchasable(p, cat?.isActive ?? false);
  const badges: ProductBadge[] = [];
  if (best.has(String(p._id))) badges.push("bestseller");
  if (!p.isSample && p.createdAt && Date.now() - new Date(p.createdAt).getTime() < NEW_PRODUCT_DAYS * 86400000) badges.push("new");
  if (p.compareAtPrice && p.compareAtPrice > p.price) badges.push("sale");
  const [first, second] = p.images;
  const lowStock = p.trackInventory && purchasable && (p.stockQuantity ?? 0) <= 5 ? (p.stockQuantity ?? 0) : null;
  return {
    id: String(p._id),
    slug: p.slug,
    name,
    shortDescription: pickText(tr.shortDescription, p.shortDescription ?? ""),
    price: p.price,
    compareAtPrice: p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice : null,
    currency: settings.currency,
    image: first ? toImage(media.get(String(first.media)), pickAt(tr.imageAlts, 0, first.alt) || name) : null,
    hoverImage: second ? toImage(media.get(String(second.media)), pickAt(tr.imageAlts, 1, second.alt) || name) : null,
    badges,
    purchasable,
    availabilityLabel: purchasable ? (lowStock !== null ? `Only ${lowStock} left` : "Available") : "Currently unavailable",
    lowStock,
    maxQuantity: purchasable ? maxQuantityFor(p, settings) : 0,
    category: cat?.ref ?? null,
    isSample: Boolean(p.isSample),
  };
}

/* ------------------------------ Public queries ---------------------------- */

const PUBLIC_FILTER = { isActive: true, archivedAt: null } as const;

export type ShopSort = "relevance" | "newest" | "price_asc" | "price_desc" | "popular";

export type ShopQuery = {
  q?: string;
  category?: string;
  occasion?: string;
  min?: number;
  max?: number;
  available?: boolean;
  sort?: ShopSort;
  page?: number;
  pageSize?: number;
};

export type ShopResult = Paginated<ProductCardDTO> & {
  hasPopularity: boolean;
  priceBounds: { min: number; max: number } | null;
  activeCategory: CategoryDTO | null;
  activeOccasion: CategoryDTO | null;
  unknownCategory: boolean;
};

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Shop listing and search. With a locale, texts are translated and search also matches the translations. */
export async function listShopProducts(query: ShopQuery, locale?: Locale): Promise<ShopResult> {
  await connectDb();
  const settings = await getSettings();
  const pageSize = Math.min(48, Math.max(1, query.pageSize ?? SHOP_PAGE_SIZE));
  const page = Math.max(1, query.page ?? 1);

  const activeCats = await Category.find({ isActive: true }).lean();
  const activeIds = activeCats.map((c) => c._id);
  const match: Record<string, unknown> = { ...PUBLIC_FILTER, category: { $in: activeIds } };

  let activeCategory: CategoryDoc | undefined;
  let activeOccasion: CategoryDoc | undefined;
  let unknownCategory = false;
  if (query.category) {
    activeCategory = activeCats.find((c) => c.slug === query.category);
    if (!activeCategory) unknownCategory = true;
    else if (activeCategory.kind === "occasion") match.occasions = activeCategory._id;
    else match.category = activeCategory._id;
  }
  if (query.occasion) {
    activeOccasion = activeCats.find((c) => c.slug === query.occasion && c.kind === "occasion");
    if (!activeOccasion) unknownCategory = true;
    else match.occasions = activeOccasion._id;
  }
  if (query.min !== undefined || query.max !== undefined) {
    const price: Record<string, number> = {};
    if (query.min !== undefined) price.$gte = toMinor(query.min, settings.currency);
    if (query.max !== undefined) price.$lte = toMinor(query.max, settings.currency);
    match.price = price;
  }
  if (query.available) {
    match.availability = "available";
    match.$or = [{ trackInventory: false }, { stockQuantity: { $gt: 0 } }];
  }

  const q = query.q?.trim().slice(0, 80);
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    const fields = ["name", "shortDescription", "composition", "colors", "description"];
    const searchOr: Record<string, RegExp>[] = fields.map((field) => ({ [field]: rx }));
    if (locale && locale !== "en") searchOr.push(...fields.map((field) => ({ [`i18n.${locale}.${field}`]: rx })));
    match.$and = [...((match.$and as unknown[]) ?? []), { $or: searchOr }];
  }

  const sort = query.sort ?? (q ? "relevance" : "relevance");
  const pipeline: PipelineStage[] = [{ $match: match }];
  if (unknownCategory) pipeline.push({ $match: { _id: null } });

  if (q && sort === "relevance") {
    const starts = new RegExp(`^${escapeRegex(q)}`, "i");
    const contains = new RegExp(escapeRegex(q), "i");
    // Rank by the translated name shown to the visitor as well as the English name.
    const names: unknown[] = locale && locale !== "en" ? [{ $ifNull: [`$i18n.${locale}.name`, ""] }, "$name"] : ["$name"];
    pipeline.push({
      $addFields: {
        _score: {
          $max: names.map((input) => ({
            $add: [
              { $cond: [{ $regexMatch: { input, regex: starts } }, 4, 0] },
              { $cond: [{ $regexMatch: { input, regex: contains } }, 2, 0] },
            ],
          })),
        },
      },
    });
  }
  const sortStage: Record<string, 1 | -1> =
    sort === "newest"
      ? { createdAt: -1 }
      : sort === "price_asc"
        ? { price: 1, createdAt: -1 }
        : sort === "price_desc"
          ? { price: -1, createdAt: -1 }
          : sort === "popular"
            ? { unitsSold: -1, createdAt: -1 }
            : q
              ? { _score: -1, isFeatured: -1, unitsSold: -1, createdAt: -1 }
              : { isFeatured: -1, unitsSold: -1, createdAt: -1 };
  pipeline.push({ $sort: { ...sortStage, _id: 1 } });
  pipeline.push({
    $facet: {
      items: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
      total: [{ $count: "n" }],
    },
  });

  const [result] = await Product.aggregate<{ items: ProductDoc[]; total: { n: number }[] }>(pipeline);
  const total = result?.total[0]?.n ?? 0;

  const [boundsRow, popular] = await Promise.all([
    Product.aggregate<{ min: number; max: number }>([
      { $match: { ...PUBLIC_FILTER, category: { $in: activeIds } } },
      { $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" } } },
    ]),
    Product.exists({ ...PUBLIC_FILTER, unitsSold: { $gt: 0 } }),
  ]);

  const counts = await categoryCounts();
  const toDto = async (c?: CategoryDoc) => (c ? (await categoriesToDto([c], counts, locale))[0] : null);

  return {
    items: await toCards(result?.items ?? [], settings, locale),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    hasPopularity: Boolean(popular),
    priceBounds: boundsRow[0] ? { min: boundsRow[0].min, max: boundsRow[0].max } : null,
    activeCategory: await toDto(activeCategory),
    activeOccasion: await toDto(activeOccasion),
    unknownCategory,
  };
}

export async function getFeaturedProducts(limit = 8, locale?: Locale): Promise<ProductCardDTO[]> {
  await connectDb();
  const settings = await getSettings();
  const activeIds = (await Category.find({ isActive: true }).select("_id").lean()).map((c) => c._id);
  const best = await getBestsellerIds();
  const bestIds = [...best].map((id) => new mongoose.Types.ObjectId(id));
  const docs = await Product.find({
    ...PUBLIC_FILTER,
    category: { $in: activeIds },
    $or: [{ isFeatured: true }, { _id: { $in: bestIds } }],
  })
    .sort({ isFeatured: -1, unitsSold: -1, createdAt: -1 })
    .limit(limit)
    .lean<ProductDoc[]>();
  if (docs.length < limit) {
    // Top up with other available products so the curated row is complete.
    const more = await Product.find({ ...PUBLIC_FILTER, category: { $in: activeIds }, _id: { $nin: docs.map((d) => d._id) } })
      .sort({ unitsSold: -1, createdAt: -1 })
      .limit(limit - docs.length)
      .lean<ProductDoc[]>();
    docs.push(...more);
  }
  return toCards(docs, settings, locale);
}

export async function getProductBySlug(slug: string, locale?: Locale): Promise<ProductDetailDTO | null> {
  await connectDb();
  const settings = await getSettings();
  const p = await Product.findOne({ slug, ...PUBLIC_FILTER }).lean<ProductDoc>();
  if (!p) return null;
  const cats = await categoryLookup(locale);
  const cat = cats.get(String(p.category));
  if (!cat?.isActive) return null;
  const [media, best] = await Promise.all([mediaInfoMap(p.images.map((i) => i.media)), getBestsellerIds()]);
  const card = cardFromDoc(p, settings, media, cats, best, locale);
  const tr = overridesFor(p.i18n, locale);
  return {
    ...card,
    description: pickText(tr.description, p.description ?? ""),
    images: p.images
      .map((i, index) => toImage(media.get(String(i.media)), pickAt(tr.imageAlts, index, i.alt) || card.name))
      .filter((i): i is ImageDTO => i !== null),
    composition: pickList(tr.composition, p.composition ?? []),
    colors: pickList(tr.colors, p.colors ?? []),
    sizeLabel: pickText(tr.sizeLabel, p.sizeLabel ?? ""),
    dimensions: pickText(tr.dimensions, p.dimensions ?? ""),
    careInstructions: pickText(tr.careInstructions, p.careInstructions ?? ""),
    allowGiftMessage: p.allowGiftMessage ?? true,
    occasions: (p.occasions ?? [])
      .map((id) => cats.get(String(id)))
      .filter((c): c is { ref: CategoryRef; isActive: boolean } => Boolean(c?.isActive))
      .map((c) => c.ref),
    seoTitle: pickText(tr.seoTitle, p.seoTitle ?? ""),
    seoDescription: pickText(tr.seoDescription, p.seoDescription ?? ""),
    updatedAt: new Date(p.updatedAt).toISOString(),
  };
}

export async function getRelatedProducts(
  productId: string,
  categoryId: string | undefined,
  limit = 4,
  locale?: Locale,
): Promise<ProductCardDTO[]> {
  await connectDb();
  const settings = await getSettings();
  const activeIds = (await Category.find({ isActive: true }).select("_id").lean()).map((c) => c._id);
  const base = { ...PUBLIC_FILTER, category: { $in: activeIds }, _id: { $ne: new mongoose.Types.ObjectId(productId) } };
  const same = categoryId
    ? await Product.find({ ...base, category: categoryId }).sort({ unitsSold: -1, createdAt: -1 }).limit(limit).lean<ProductDoc[]>()
    : [];
  let docs = same;
  if (docs.length < limit) {
    const more = await Product.find({ ...base, _id: { $nin: [new mongoose.Types.ObjectId(productId), ...docs.map((d) => d._id)] } })
      .sort({ isFeatured: -1, unitsSold: -1 })
      .limit(limit - docs.length)
      .lean<ProductDoc[]>();
    docs = [...docs, ...more];
  }
  return toCards(docs, settings, locale);
}

export async function getProductsByIds(ids: string[], locale?: Locale): Promise<ProductCardDTO[]> {
  const valid = ids.filter((id) => mongoose.isValidObjectId(id));
  if (valid.length === 0) return [];
  await connectDb();
  const settings = await getSettings();
  const docs = await Product.find({ _id: { $in: valid }, archivedAt: null, isActive: true }).lean<ProductDoc[]>();
  const order = new Map(valid.map((id, i) => [id, i]));
  docs.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
  return toCards(docs, settings, locale);
}

/* ------------------------------- Categories ------------------------------- */

async function categoryCounts(): Promise<Map<string, number>> {
  const rows = await Product.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
    { $match: PUBLIC_FILTER },
    { $project: { cats: { $concatArrays: [["$category"], { $ifNull: ["$occasions", []] }] } } },
    { $unwind: "$cats" },
    { $group: { _id: "$cats", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

async function categoriesToDto(cats: CategoryDoc[], counts?: Map<string, number>, locale?: Locale): Promise<CategoryDTO[]> {
  const media = await mediaInfoMap(cats.map((c) => c.image));
  const n = counts ?? (await categoryCounts());
  return cats.map((c) => {
    const tr = overridesFor(c.i18n, locale);
    const name = pickText(tr.name, c.name);
    return {
      id: String(c._id),
      name,
      slug: c.slug,
      kind: c.kind as CategoryDTO["kind"],
      description: pickText(tr.description, c.description ?? ""),
      image: c.image ? toImage(media.get(String(c.image)), pickText(tr.imageAlt, c.imageAlt ?? "") || name) : null,
      isFeatured: c.isFeatured,
      productCount: n.get(String(c._id)) ?? 0,
      seoTitle: pickText(tr.seoTitle, c.seoTitle ?? ""),
      seoDescription: pickText(tr.seoDescription, c.seoDescription ?? ""),
      isSample: Boolean(c.isSample),
    };
  });
}

export async function listPublicCategories(kind?: "collection" | "occasion", locale?: Locale): Promise<CategoryDTO[]> {
  await connectDb();
  const filter: Record<string, unknown> = { isActive: true };
  if (kind) filter.kind = kind;
  const cats = await Category.find(filter).sort({ sortOrder: 1, name: 1 }).lean<CategoryDoc[]>();
  return categoriesToDto(cats, undefined, locale);
}

export async function getPublicCategory(slug: string, locale?: Locale): Promise<CategoryDTO | null> {
  await connectDb();
  const c = await Category.findOne({ slug, isActive: true }).lean<CategoryDoc>();
  if (!c) return null;
  return (await categoriesToDto([c], undefined, locale))[0];
}
