import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { connectDb } from "@/lib/db";
import { Category, Product } from "@/lib/models/catalog";
import { logger } from "@/lib/logger";
import { LOCALES } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";

type Entry = MetadataRoute.Sitemap[number];

/**
 * Public, indexable URLs only, listed once per language with hreflang alternates.
 * Sample products are excluded. Generated at request time from the database.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  /** One entry per locale for a storefront path (without locale, e.g. "/shop"). */
  const localized = (path: string, extra: Omit<Entry, "url" | "alternates">): Entry[] =>
    LOCALES.map((locale) => {
      const { canonical, languages } = localeAlternates(path, locale);
      return {
        ...extra,
        url: `${base}${canonical}`,
        alternates: { languages: Object.fromEntries(Object.entries(languages).map(([l, p]) => [l, `${base}${p}`])) },
      };
    });

  const statics = ["/", "/shop", "/categories", "/about", "/delivery", "/contact", "/legal/privacy", "/legal/terms", "/legal/returns"].flatMap((p) =>
    localized(p, { changeFrequency: "weekly", priority: p === "/" ? 1 : 0.6 }),
  );
  try {
    await connectDb();
    const [cats, products] = await Promise.all([
      Category.find({ isActive: true }).select("slug updatedAt").lean(),
      Product.find({ isActive: true, archivedAt: null, isSample: { $ne: true } }).select("slug updatedAt").lean(),
    ]);
    return [
      ...statics,
      ...cats.flatMap((c) => localized(`/categories/${c.slug}`, { lastModified: c.updatedAt, priority: 0.7 })),
      ...products.flatMap((p) => localized(`/products/${p.slug}`, { lastModified: p.updatedAt, priority: 0.8 })),
    ];
  } catch (error) {
    logger.error("sitemap generation failed", { error });
    return statics;
  }
}
