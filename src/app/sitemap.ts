import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { connectDb } from "@/lib/db";
import { Category, Product } from "@/lib/models/catalog";
import { logger } from "@/lib/logger";

/** Public, indexable URLs only. Sample products are excluded. Generated at request time from the database. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const statics = ["", "/shop", "/categories", "/about", "/delivery", "/contact", "/legal/privacy", "/legal/terms", "/legal/returns"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.6,
  }));
  try {
    await connectDb();
    const [cats, products] = await Promise.all([
      Category.find({ isActive: true }).select("slug updatedAt").lean(),
      Product.find({ isActive: true, archivedAt: null, isSample: { $ne: true } }).select("slug updatedAt").lean(),
    ]);
    return [
      ...statics,
      ...cats.map((c) => ({ url: `${base}/categories/${c.slug}`, lastModified: c.updatedAt, priority: 0.7 })),
      ...products.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: p.updatedAt, priority: 0.8 })),
    ];
  } catch (error) {
    logger.error("sitemap generation failed", { error });
    return statics;
  }
}
