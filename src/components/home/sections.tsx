import Image from "next/image";
import { Link } from "@/i18n/client";
import { ArrowRight, ArrowUpRight, Star, Truck, Store, Clock, Hand, Gift, Leaf } from "lucide-react";
import { InstagramIcon } from "@/components/ui/social-icons";
import { Reveal } from "@/components/ui/reveal";
import { LinkButton } from "@/components/ui/button";
import { ProductGrid } from "@/components/store/product-grid";
import { ImageFallback } from "@/components/store/image-fallback";
import type { CurrencyCode } from "@/lib/domain/money";
import { getStoreI18n } from "@/i18n/server";
import { brand } from "@/lib/brand";
import type { CategoryDTO, DeliveryMethodDTO, ProductCardDTO } from "@/lib/types";
import type { StoreSettings } from "@/lib/services/settings";
import type { PublicReview } from "@/lib/services/engagement";
import type { GalleryItemDTO } from "@/lib/services/admin";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"}>
      <div className={align === "center" ? "" : "max-w-2xl"}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-3 font-display text-[2.15rem] leading-[1.08] text-ink sm:text-[2.75rem]">{title}</h2>
        {description && <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {action && <div className={align === "center" ? "mt-6" : "shrink-0"}>{action}</div>}
    </div>
  );
}

export async function CategoryShowcase({ categories }: { categories: CategoryDTO[] }) {
  if (categories.length === 0) return null;
  const { t } = await getStoreI18n();
  return (
    <section className="py-16 lg:py-24" aria-labelledby="collections-heading">
      <div className="container-page">
        <Reveal>
          <div id="collections-heading">
            <SectionHeading
              eyebrow={t("home.collectionsEyebrow")}
              title={t("home.collectionsTitle")}
              action={
                <Link href="/categories" className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
                  {t("nav.allCollections")} <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
          </div>
        </Reveal>
        <ul className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-6 [&::-webkit-scrollbar]:hidden">
          {categories.map((c, i) => (
            <li key={c.id} className="w-[44vw] shrink-0 snap-start sm:w-auto">
              <Reveal delay={i * 60}>
                <Link href={`/categories/${c.slug}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-t-[999px] rounded-b-[1.25rem] bg-cream">
                    {c.image ? (
                      <Image
                        src={c.image.src}
                        alt={c.image.alt}
                        fill
                        sizes="(min-width: 1024px) 16vw, (min-width: 640px) 30vw, 44vw"
                        className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105"
                      />
                    ) : (
                      <ImageFallback />
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <h3 className="font-display text-xl text-ink transition-colors group-hover:text-brand">{c.name}</h3>
                    <p className="text-[12.5px] text-ink-muted">
                      {t("shop.pieces", { count: c.productCount })}
                    </p>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export async function FeaturedProducts({ products }: { products: ProductCardDTO[] }) {
  if (products.length === 0) return null;
  const { t } = await getStoreI18n();
  return (
    <section className="bg-paper py-16 lg:py-24" aria-labelledby="featured-heading">
      <div className="container-page">
        <Reveal>
          <div id="featured-heading">
            <SectionHeading
              eyebrow={t("home.featuredEyebrow")}
              title={t("home.featuredTitle")}
              description={t("home.featuredText")}
              action={
                <LinkButton href="/shop" variant="outline" icon={<ArrowRight className="h-4 w-4" />}>
                  {t("home.shopAll")}
                </LinkButton>
              }
            />
          </div>
        </Reveal>
        <ProductGrid products={products.slice(0, products.length >= 4 ? Math.floor(Math.min(products.length, 8) / 4) * 4 : products.length)} className="mt-10" />
      </div>
    </section>
  );
}

export async function BrandStory({ content }: { content: StoreSettings["content"] }) {
  const { t } = await getStoreI18n();
  const paragraphs = content.storyBody.split(/\n{2,}/).filter(Boolean);
  return (
    <section className="py-16 lg:py-28" aria-labelledby="story-heading">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal className="relative order-2 lg:order-1">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-cream">
            {content.storyImage ? (
              <Image src={content.storyImage} alt={content.storyImageAlt} fill sizes="(min-width: 1024px) 45vw, 92vw" className="object-cover" />
            ) : (
              <ImageFallback />
            )}
          </div>
          <div aria-hidden="true" className="absolute -bottom-6 -right-4 hidden h-40 w-40 rounded-full bg-brand-100/70 lg:block" />
        </Reveal>
        <Reveal className="order-1 lg:order-2" delay={100}>
          <p className="eyebrow">{t("home.craftEyebrow")}</p>
          <h2 id="story-heading" className="mt-3 font-display text-[2.3rem] leading-[1.08] text-ink sm:text-5xl">
            {content.storyTitle}
          </h2>
          <div className="prose-floral mt-6 max-w-lg text-[16.5px]">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <ul className="mt-9 grid gap-5 sm:grid-cols-3">
            {[
              { icon: Hand, title: t("home.value1Title"), text: t("home.value1Text") },
              { icon: Gift, title: t("home.value2Title"), text: t("home.value2Text") },
              { icon: Leaf, title: t("home.value3Title"), text: t("home.value3Text") },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <Icon className="h-5 w-5 text-brand" />
                <p className="mt-2 text-sm font-semibold text-ink">{title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{text}</p>
              </li>
            ))}
          </ul>
          <LinkButton href="/about" variant="link" className="mt-8" icon={null}>
            {t("home.moreAbout")} <ArrowRight className="h-4 w-4" />
          </LinkButton>
        </Reveal>
      </div>
    </section>
  );
}

export async function OccasionShowcase({ occasions }: { occasions: CategoryDTO[] }) {
  if (occasions.length === 0) return null;
  const { t } = await getStoreI18n();
  return (
    <section id="occasions" className="bg-brand-900 py-16 text-ivory lg:py-24" aria-labelledby="occasions-heading">
      <div className="container-page">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow !text-brand-200">{t("home.occasionsEyebrow")}</p>
            <h2 id="occasions-heading" className="mt-3 font-display text-[2.15rem] leading-[1.08] sm:text-[2.75rem]">
              {t("home.occasionsTitle")}
            </h2>
            <p className="mt-3 text-[15.5px] text-ivory/70">{t("home.occasionsText")}</p>
          </div>
        </Reveal>
        <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-5">
          {occasions.map((o, i) => (
            <li key={o.id} className={i === 0 && occasions.length % 2 === 1 ? "col-span-2 lg:col-span-1" : ""}>
              <Reveal delay={i * 70}>
                <Link href={`/categories/${o.slug}`} className="group relative block overflow-hidden rounded-[1.5rem]">
                  <div className="relative aspect-[4/5]">
                    {o.image ? (
                      <Image src={o.image.src} alt={o.image.alt} fill sizes="(min-width: 1024px) 20vw, 50vw" className="object-cover transition-transform duration-[900ms] group-hover:scale-105" />
                    ) : (
                      <ImageFallback />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-900/85 via-brand-900/15 to-transparent" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 sm:p-5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ivory/70">{t("home.for")}</p>
                      <h3 className="font-display text-2xl leading-tight text-ivory">{o.name}</h3>
                    </div>
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ivory/15 text-ivory backdrop-blur transition-colors group-hover:bg-ivory group-hover:text-brand">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export async function DeliverySection({ methods, currency, deliveryInfo }: { methods: DeliveryMethodDTO[]; currency: CurrencyCode; deliveryInfo: string }) {
  if (methods.length === 0) return null;
  const { t, f } = await getStoreI18n();
  return (
    <section className="py-16 lg:py-24" aria-labelledby="delivery-heading">
      <div className="container-page grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <Reveal>
          <p className="eyebrow">{t("home.deliveryEyebrow")}</p>
          <h2 id="delivery-heading" className="mt-3 font-display text-[2.15rem] leading-[1.08] text-ink sm:text-[2.75rem]">
            {t("home.deliveryTitle")}
          </h2>
          <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-ink-soft">
            {deliveryInfo || t("home.deliveryText")}
          </p>
          <LinkButton href="/delivery" variant="outline" className="mt-7" icon={<ArrowRight className="h-4 w-4" />}>
            {t("home.deliveryDetails")}
          </LinkButton>
        </Reveal>
        <ul className="grid gap-4 sm:grid-cols-2">
          {methods.map((m, i) => {
            const Icon = m.type === "pickup" ? Store : Truck;
            return (
              <li key={m.id}>
                <Reveal delay={i * 80} className="h-full">
                  <div className="flex h-full flex-col rounded-[1.5rem] border border-line bg-paper p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-display text-2xl text-ink">{m.name}</h3>
                    {m.description && <p className="mt-2 text-sm leading-relaxed text-ink-muted">{m.description}</p>}
                    <dl className="mt-auto space-y-2 pt-5 text-sm">
                      <div className="flex justify-between gap-3 border-t border-line pt-3">
                        <dt className="text-ink-muted">{m.type === "pickup" ? t("checkout.pickup") : t("delivery.fee")}</dt>
                        <dd className="font-semibold text-ink tabular">
                          {m.fee === 0 && m.zones.every((z) => !z.fee) ? t("common.free") : t("delivery.from", { amount: f.money(Math.min(m.fee, ...m.zones.map((z) => z.fee ?? m.fee)), currency) })}
                        </dd>
                      </div>
                      {m.freeOverAmount !== null && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-ink-muted">{t("delivery.freeFrom")}</dt>
                          <dd className="font-semibold text-ink tabular">{f.money(m.freeOverAmount, currency)}</dd>
                        </div>
                      )}
                      {m.estimatedTime && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-ink-muted">{t("delivery.timing")}</dt>
                          <dd className="text-right font-semibold text-ink">{m.estimatedTime}</dd>
                        </div>
                      )}
                      {m.timeWindows.length > 0 && (
                        <div className="flex justify-between gap-3">
                          <dt className="flex items-center gap-1.5 text-ink-muted">
                            <Clock className="h-3.5 w-3.5" /> {t("delivery.timeWindows")}
                          </dt>
                          <dd className="font-semibold text-ink tabular">
                            {m.timeWindows[0].start}–{m.timeWindows[m.timeWindows.length - 1].end}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export async function Testimonials({ reviews }: { reviews: PublicReview[] }) {
  const { t } = await getStoreI18n();
  if (reviews.length === 0) {
    // No verified reviews yet: a neutral brand statement instead of invented testimonials.
    return (
      <section className="border-y border-line bg-cream/60 py-16 lg:py-20">
        <Reveal className="container-page mx-auto max-w-3xl text-center">
          <Leaf className="mx-auto h-6 w-6 text-sage" />
          <p className="mt-6 font-display text-[1.9rem] italic leading-snug text-ink sm:text-[2.4rem]">
            {t("home.quote")}
          </p>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-ink-muted">{t("brand.name")}</p>
        </Reveal>
      </section>
    );
  }
  return (
    <section className="bg-cream/60 py-16 lg:py-24" aria-labelledby="reviews-heading">
      <div className="container-page">
        <Reveal>
          <div id="reviews-heading">
            <SectionHeading align="center" eyebrow={t("home.reviewsEyebrow")} title={t("home.reviewsTitle")} description={t("home.reviewsText")} />
          </div>
        </Reveal>
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {reviews.slice(0, 3).map((r, i) => (
            <li key={r.id}>
              <Reveal delay={i * 80} className="h-full">
                <figure className="flex h-full flex-col rounded-[1.5rem] border border-line bg-paper p-7">
                  <div className="flex gap-0.5 text-brand" aria-label={t("review.rated", { rating: r.rating })}>
                    {Array.from({ length: 5 }, (_, s) => (
                      <Star key={s} className={s < r.rating ? "h-4 w-4 fill-current" : "h-4 w-4 opacity-25"} aria-hidden="true" />
                    ))}
                  </div>
                  {r.title && <p className="mt-4 font-semibold text-ink">{r.title}</p>}
                  <blockquote className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-soft">“{r.body}”</blockquote>
                  <figcaption className="mt-6 text-sm">
                    <span className="font-semibold text-ink">{r.authorName}</span>
                    {r.productName && (
                      <span className="text-ink-muted">
                        {" "}
                        · <Link href={`/products/${r.productSlug}`} className="hover:text-brand">{r.productName}</Link>
                      </span>
                    )}
                    <span className="mt-1 block text-[12px] text-success">{t("review.verified")}</span>
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export async function GallerySection({ items, instagramUrl }: { items: GalleryItemDTO[]; instagramUrl: string }) {
  const { t } = await getStoreI18n();
  const withImages = items.filter((i) => i.image);
  // One large tile + 4 or 8 small tiles keeps the mosaic free of gaps.
  const visible = withImages.slice(0, withImages.length >= 9 ? 9 : 5);
  if (visible.length === 0) return null;
  return (
    <section className="py-16 lg:py-24" aria-labelledby="gallery-heading">
      <div className="container-page">
        <Reveal>
          <div id="gallery-heading">
            <SectionHeading
              eyebrow={`@${brand.instagramHandle}`}
              title={t("home.galleryTitle")}
              description={t("home.galleryText")}
              action={
                instagramUrl ? (
                  <LinkButton href={instagramUrl} target="_blank" rel="noopener noreferrer" variant="outline" icon={<InstagramIcon className="h-4 w-4" />}>
                    {t("home.followInstagram")}
                  </LinkButton>
                ) : undefined
              }
            />
          </div>
        </Reveal>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {visible.map((item, i) => {
            const tile = (
              <div className="group relative aspect-square h-full w-full overflow-hidden rounded-[1.25rem] bg-cream">
                <Image src={item.image!.src} alt={item.alt} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                {item.caption && (
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/60 to-transparent p-3 text-[13px] text-ivory opacity-0 transition-opacity group-hover:opacity-100">
                    {item.caption}
                  </span>
                )}
              </div>
            );
            return (
              <li key={item.id} className={i === 0 ? "col-span-2 row-span-2" : ""}>
                <Reveal delay={(i % 4) * 60}>
                  {item.link ? (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" aria-label={t("common.opensNewTab", { label: item.alt })}>
                      {tile}
                    </a>
                  ) : (
                    tile
                  )}
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
