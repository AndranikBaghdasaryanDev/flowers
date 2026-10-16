import { Suspense } from "react";
import type { Metadata } from "next";
import { Link } from "@/i18n/client";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Truck, Store, Star, Leaf, Ruler, Palette, Flower2, Info } from "lucide-react";
import { Breadcrumbs } from "@/components/store/page-header";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductPurchase } from "@/components/store/product-purchase";
import { ProductGrid, ProductGridSkeleton } from "@/components/store/product-grid";
import { SectionHeading } from "@/components/home/sections";
import { Skeleton } from "@/components/ui/spinner";
import { getProductBySlug, getRelatedProducts } from "@/lib/services/catalog";
import { listActiveDeliveryMethods } from "@/lib/services/delivery";
import { getProductReviews } from "@/lib/services/engagement";
import { getSettings } from "@/lib/services/settings";
import { currencyDecimals, toMajor } from "@/lib/domain/money";
import { env } from "@/lib/env";
import { getStoreI18n } from "@/i18n/server";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/products/[slug]">): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const { locale, t } = await getStoreI18n();
  const product = await getProductBySlug(slug, locale).catch(() => null);
  if (!product) return { title: t("notFound.title"), robots: { index: false } };
  const description = product.seoDescription || product.shortDescription || product.description.slice(0, 160);
  return {
    title: product.seoTitle || product.name,
    description,
    alternates: localeAlternates(`/products/${product.slug}`, locale),
    robots: product.isSample ? { index: false } : undefined,
    openGraph: {
      title: product.name,
      description,
      type: "website",
      images: product.images.slice(0, 1).map((i) => ({ url: i.src, width: i.width, height: i.height, alt: i.alt })),
    },
  };
}

async function ProductContent({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const { locale, t, f } = await getStoreI18n();
  const product = await getProductBySlug(slug, locale);
  if (!product) notFound();
  const [methods, reviews, settings] = await Promise.all([listActiveDeliveryMethods(locale), getProductReviews(product.id), getSettings(locale)]);

  // Structured data only for real (non-sample) listings, and ratings only from real approved reviews.
  const jsonLd = product.isSample
    ? null
    : {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.shortDescription || product.description,
        image: product.images.map((i) => `${env.appUrl}${i.src}`),
        sku: product.slug,
        brand: { "@type": "Brand", name: "Floriani Flowers" },
        offers: {
          "@type": "Offer",
          url: `${env.appUrl}/${locale}/products/${product.slug}`,
          price: toMajor(product.price, product.currency).toFixed(currencyDecimals(product.currency)),
          priceCurrency: product.currency,
          availability: product.purchasable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        },
        ...(reviews.count > 0 && reviews.average !== null
          ? { aggregateRating: { "@type": "AggregateRating", ratingValue: reviews.average, reviewCount: reviews.count } }
          : {}),
      };

  const details = [
    product.composition.length > 0 && { icon: Flower2, label: t("product.composition"), value: product.composition.join(", ") },
    product.colors.length > 0 && { icon: Palette, label: t("product.colors"), value: product.colors.join(", ") },
    (product.sizeLabel || product.dimensions) && { icon: Ruler, label: t("product.size"), value: [product.sizeLabel, product.dimensions].filter(Boolean).join(" · ") },
  ].filter(Boolean) as { icon: typeof Flower2; label: string; value: string }[];

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <div className="container-page pb-6 pt-6 sm:pt-8">
        <Breadcrumbs
          items={[
            { label: t("nav.home"), href: "/" },
            { label: t("nav.shop"), href: "/shop" },
            ...(product.category ? [{ label: product.category.name, href: `/categories/${product.category.slug}` }] : []),
            { label: product.name },
          ]}
        />
      </div>

      <div className="container-page grid gap-10 pb-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <ProductGallery images={product.images} name={product.name} />
        </div>

        <div className="min-w-0">
          {product.isSample && (
            <p className="mb-5 flex items-start gap-2 rounded-xl border border-line bg-cream px-4 py-3 text-[13px] text-ink-soft">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
              {t("product.sampleNotice")}
            </p>
          )}
          {product.category && (
            <Link href={`/categories/${product.category.slug}`} className="eyebrow hover:underline">
              {product.category.name}
            </Link>
          )}
          <h1 className="mt-3 font-display text-[2.5rem] leading-[1.05] text-ink sm:text-5xl">{product.name}</h1>
          {reviews.count > 0 && reviews.average !== null && (
            <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-brand">
              <span className="flex text-brand" aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={i < Math.round(reviews.average!) ? "h-4 w-4 fill-current" : "h-4 w-4 opacity-30"} />
                ))}
              </span>
              {t("product.ratingSummary", { average: reviews.average, count: reviews.count })}
            </a>
          )}
          {product.shortDescription && <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">{product.shortDescription}</p>}

          <div className="mt-7">
            <ProductPurchase product={product} />
          </div>

          {details.length > 0 && (
            <dl className="mt-10 divide-y divide-line border-y border-line">
              {details.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex gap-4 py-4">
                  <dt className="flex w-36 shrink-0 items-center gap-2.5 text-sm font-semibold text-ink">
                    <Icon className="h-4 w-4 text-brand" /> {label}
                  </dt>
                  <dd className="text-sm text-ink-soft">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-8 space-y-3">
            {product.description && (
              <details open className="group rounded-2xl border border-line bg-paper px-5 py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-[15px] font-semibold text-ink">
                  {t("product.description")} <span className="text-brand transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="prose-floral pb-4 text-[15px]">
                  {product.description.split(/\n{2,}/).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </details>
            )}
            {product.careInstructions && (
              <details className="group rounded-2xl border border-line bg-paper px-5 py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-[15px] font-semibold text-ink">
                  <span className="flex items-center gap-2"><Leaf className="h-4 w-4 text-sage" /> {t("product.care")}</span>
                  <span className="text-brand transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="pb-4 text-[15px] leading-relaxed text-ink-soft">{product.careInstructions}</p>
              </details>
            )}
            {methods.length > 0 && (
              <details className="group rounded-2xl border border-line bg-paper px-5 py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-[15px] font-semibold text-ink">
                  <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-brand" /> {t("home.deliveryEyebrow")}</span>
                  <span className="text-brand transition-transform group-open:rotate-45">+</span>
                </summary>
                <ul className="space-y-3 pb-4">
                  {methods.map((m) => (
                    <li key={m.id} className="flex gap-3 text-sm">
                      {m.type === "pickup" ? <Store className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" /> : <Truck className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />}
                      <span className="text-ink-soft">
                        <span className="font-semibold text-ink">{m.name}</span>
                        {" — "}
                        {m.fee === 0 ? t("common.freeLower") : f.money(m.fee, settings.currency)}
                        {m.freeOverAmount !== null && `, ${t("delivery.freeFromLower", { amount: f.money(m.freeOverAmount, settings.currency) })}`}
                        {m.estimatedTime && `. ${m.estimatedTime}`}
                        {m.timeWindows.length > 0 && `. ${t("product.chooseWindow")}`}
                      </span>
                    </li>
                  ))}
                  <li>
                    <Link href="/delivery" className="text-sm font-semibold text-brand hover:underline">
                      {t("home.deliveryDetails")} →
                    </Link>
                  </li>
                </ul>
              </details>
            )}
          </div>
        </div>
      </div>

      <section id="reviews" className="scroll-mt-28 border-t border-line bg-paper py-16" aria-labelledby="reviews-h">
        <div className="container-page grid gap-10 lg:grid-cols-[320px_1fr]">
          <div>
            <h2 id="reviews-h" className="font-display text-3xl text-ink">{t("product.reviews")}</h2>
            {reviews.count > 0 ? (
              <p className="mt-3 text-sm text-ink-soft">
                {t("product.reviewsSummary", { average: reviews.average ?? 0, count: reviews.count })}
              </p>
            ) : (
              <p className="mt-3 text-sm text-ink-soft">{t("product.noReviews")}</p>
            )}
            <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
              {t.rich("product.reviewsHow", { link: (c) => <Link href="/account/orders" className="text-brand hover:underline">{c}</Link> })}
            </p>
          </div>
          {reviews.count > 0 && (
            <ul className="space-y-6">
              {reviews.reviews.map((r) => (
                <li key={r.id} className="rounded-2xl border border-line bg-ivory p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex text-brand" aria-label={t("review.rated", { rating: r.rating })}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={i < r.rating ? "h-4 w-4 fill-current" : "h-4 w-4 opacity-25"} aria-hidden="true" />
                      ))}
                    </span>
                    <time className="text-xs text-ink-muted" dateTime={r.createdAt}>
                      {f.date(r.createdAt, { day: "numeric", month: "short", year: "numeric" })}
                    </time>
                  </div>
                  {r.title && <p className="mt-3 font-semibold text-ink">{r.title}</p>}
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{r.body}</p>
                  <p className="mt-3 text-sm font-semibold text-ink">
                    {r.authorName} <span className="ml-1 text-xs font-medium text-success">{t("review.verified")}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Suspense fallback={<div className="container-page py-16"><ProductGridSkeleton count={4} /></div>}>
        <Related productId={product.id} categoryId={product.category?.id} />
      </Suspense>
    </>
  );
}

async function Related({ productId, categoryId }: { productId: string; categoryId?: string }) {
  const { locale, t } = await getStoreI18n();
  const related = await getRelatedProducts(productId, categoryId, 4, locale);
  if (related.length === 0) return null;
  return (
    <section className="py-16 lg:py-20" aria-labelledby="related-h">
      <div className="container-page">
        <div id="related-h">
          <SectionHeading eyebrow={t("product.relatedEyebrow")} title={t("product.relatedTitle")} />
        </div>
        <ProductGrid products={related} className="mt-10" />
      </div>
    </section>
  );
}

export default function ProductPage({ params }: PageProps<"/[locale]/products/[slug]">) {
  return (
    <Suspense
      fallback={
        <div className="container-page grid gap-10 pb-20 pt-14 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <Skeleton className="aspect-[4/5] w-full rounded-[1.75rem]" />
          <div className="space-y-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-13 w-full rounded-full" />
          </div>
        </div>
      }
    >
      <ProductContent params={params} />
    </Suspense>
  );
}
