import "server-only";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { NewsletterSubscriber, Review } from "@/lib/models/content";
import { Order } from "@/lib/models/order";
import { Product, type ProductDoc } from "@/lib/models/catalog";
import { overridesFor, pickText } from "@/lib/localize";
import type { Locale } from "@/i18n/config";
import { ApiError } from "@/lib/api/errors";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import type { SessionUser } from "@/lib/auth/session";
import { clientIp } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";

export type PublicReview = { id: string; rating: number; title: string; body: string; authorName: string; createdAt: string; productName?: string; productSlug?: string };

/** "Anna K." — first name and last initial only. */
function displayName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

export async function submitReview(user: SessionUser, input: { productId: string; rating: number; title: string; body: string }) {
  await connectDb();
  await enforceRateLimit(`review:${user.id}`, 10, 60 * 60);
  // Only verified purchases: a delivered/completed order of this customer containing the product.
  const order = await Order.findOne({
    user: user.id,
    status: { $in: ["delivered", "completed"] },
    "items.product": new mongoose.Types.ObjectId(input.productId),
  })
    .select("_id")
    .lean();
  if (!order) throw ApiError.forbidden("server.errors.reviewNotAllowed");
  try {
    await Review.create({
      product: input.productId,
      user: user.id,
      order: order._id,
      rating: input.rating,
      title: input.title,
      body: input.body,
      authorName: displayName(user.name),
      status: "pending",
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw ApiError.conflict("server.errors.alreadyReviewed");
    throw error;
  }
}

export async function getProductReviews(productId: string): Promise<{ reviews: PublicReview[]; average: number | null; count: number }> {
  await connectDb();
  const docs = await Review.find({ product: productId, status: "approved" }).sort({ createdAt: -1 }).limit(20).lean();
  const [agg] = await Review.aggregate<{ avg: number; n: number }>([
    { $match: { product: new mongoose.Types.ObjectId(productId), status: "approved" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, n: { $sum: 1 } } },
  ]);
  return {
    reviews: docs.map((r) => ({
      id: String(r._id),
      rating: r.rating,
      title: r.title ?? "",
      body: r.body,
      authorName: r.authorName,
      createdAt: new Date(r.createdAt).toISOString(),
    })),
    average: agg ? Math.round(agg.avg * 10) / 10 : null,
    count: agg?.n ?? 0,
  };
}

/** Approved, verified-purchase reviews for the homepage. Empty when there are none — never fabricated. */
export async function getTestimonials(limit = 6, locale?: Locale): Promise<PublicReview[]> {
  await connectDb();
  const docs = await Review.find({ status: "approved", rating: { $gte: 4 } }).sort({ createdAt: -1 }).limit(limit).lean();
  const products = await Product.find({ _id: { $in: docs.map((d) => d.product) } }).select("name slug i18n").lean<ProductDoc[]>();
  const pm = new Map(products.map((p) => [String(p._id), p]));
  const productName = (id: string) => {
    const p = pm.get(id);
    return p ? pickText(overridesFor(p.i18n, locale).name, p.name) : undefined;
  };
  return docs.map((r) => ({
    id: String(r._id),
    rating: r.rating,
    title: r.title ?? "",
    body: r.body,
    authorName: r.authorName,
    createdAt: new Date(r.createdAt).toISOString(),
    productName: productName(String(r.product)),
    productSlug: pm.get(String(r.product))?.slug,
  }));
}

export async function subscribeNewsletter(email: string, source: string) {
  await connectDb();
  const ip = await clientIp();
  await enforceRateLimit(`newsletter:${ip}`, 10, 60 * 60);
  const existing = await NewsletterSubscriber.findOne({ email }).lean();
  if (existing) {
    if (existing.status !== "subscribed") await NewsletterSubscriber.updateOne({ _id: existing._id }, { $set: { status: "subscribed" } });
    return;
  }
  try {
    await NewsletterSubscriber.create({ email, source, unsubscribeTokenHash: hashToken(generateToken()) });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
}
