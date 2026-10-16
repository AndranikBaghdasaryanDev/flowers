import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Truck, Gift, Flower2 } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import type { StoreSettings } from "@/lib/services/settings";
import type { ProductCardDTO } from "@/lib/types";

export function Hero({
  content,
  featured,
  deliveryCity,
}: {
  content: StoreSettings["content"];
  featured: ProductCardDTO | null;
  deliveryCity: string | null;
}) {
  return (
    <section className="relative overflow-hidden">
      {/* soft botanical wash */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-brand-100/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-40 h-[420px] w-[420px] rounded-full bg-sage-100/60 blur-3xl" />

      <div className="container-page relative grid items-center gap-10 pb-16 pt-8 sm:pt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24 lg:pt-14">
        <div className="max-w-xl animate-fade-up">
          <p className="eyebrow">{content.heroEyebrow}</p>
          <h1 className="mt-5 font-display text-[2.9rem] leading-[1.02] text-ink sm:text-6xl lg:text-[4.6rem]">
            {content.heroTitle}
          </h1>
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-soft">{content.heroSubtitle}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/shop" size="lg" icon={<Flower2 className="h-[18px] w-[18px]" />}>
              Shop flowers
            </LinkButton>
            <LinkButton href="/categories#occasions" size="lg" variant="outline">
              Choose by occasion
            </LinkButton>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-[13.5px] text-ink-soft">
            {deliveryCity && (
              <li className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-brand" /> Delivery across {deliveryCity}
              </li>
            )}
            <li className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-brand" /> Personal gift message
            </li>
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[540px] animate-fade-in lg:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[2rem] bg-cream shadow-lift">
            {content.heroImage ? (
              <Image
                src={content.heroImage}
                alt={content.heroImageAlt}
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 92vw"
                quality={80}
                className="animate-hero-drift object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-brand-100 via-cream to-sage-100" />
            )}
            <div aria-hidden="true" className="absolute inset-0 rounded-t-[999px] rounded-b-[2rem] ring-1 ring-inset ring-ink/5" />
          </div>
          <div aria-hidden="true" className="absolute -left-4 top-10 hidden h-28 w-28 rounded-full border border-brand/20 sm:block lg:-left-10" />

          {featured && (
            <Link
              href={`/products/${featured.slug}`}
              className="group absolute -bottom-6 left-3 flex max-w-[290px] items-center gap-3 rounded-2xl border border-line/70 bg-paper/95 p-3 pr-4 shadow-lift backdrop-blur transition-transform hover:-translate-y-0.5 sm:-left-6"
            >
              <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-cream">
                {featured.image && <Image src={featured.image.src} alt="" fill sizes="64px" className="object-cover" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[10.5px] font-bold uppercase tracking-[0.18em] text-brand">Featured</span>
                <span className="block truncate font-display text-lg leading-tight text-ink">{featured.name}</span>
                <Price amount={featured.price} compareAt={featured.compareAtPrice} currency={featured.currency} size="sm" />
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
