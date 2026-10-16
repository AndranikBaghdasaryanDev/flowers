"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart, Plus, Check } from "lucide-react";
import { Price } from "@/components/ui/price";
import { useCart } from "@/components/providers/cart-provider";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/ui/toast";
import { ImageFallback } from "@/components/store/image-fallback";
import { cn } from "@/lib/cn";
import type { ProductCardDTO } from "@/lib/types";

const BADGE_LABEL = { bestseller: "Bestseller", new: "New", sale: "Sale" } as const;

export function ProductCard({ product, priority, sizes }: { product: ProductCardDTO; priority?: boolean; sizes?: string }) {
  const cart = useCart();
  const toast = useToast();
  const { favorites, toggleFavorite } = useSession();
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isFavorite = favorites.has(product.id);
  const href = `/products/${product.slug}`;

  const quickAdd = () => {
    if (!product.purchasable) return;
    cart.add(product.id, 1, {
      name: product.name,
      slug: product.slug,
      image: product.image,
      unitPrice: product.price,
      maxQuantity: product.maxQuantity,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
    toast.success(`${product.name} added to your bag`, undefined, { label: "View bag", href: "/cart" });
  };

  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-cream">
        <Link href={href} className="block" tabIndex={-1} aria-hidden="true">
          <div className="relative aspect-[4/5]">
            {product.image && !imgError ? (
              <>
                <Image
                  src={product.image.src}
                  alt={product.image.alt}
                  fill
                  priority={priority}
                  sizes={sizes ?? "(min-width: 1280px) 300px, (min-width: 768px) 33vw, 50vw"}
                  quality={80}
                  onError={() => setImgError(true)}
                  className={cn(
                    "object-cover transition-[transform,opacity] duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.04]",
                    product.hoverImage && "lg:group-hover:opacity-0",
                    !product.purchasable && "opacity-80 grayscale-[35%]",
                  )}
                />
                {product.hoverImage && (
                  <Image
                    src={product.hoverImage.src}
                    alt=""
                    fill
                    sizes={sizes ?? "(min-width: 1280px) 300px, (min-width: 768px) 33vw, 50vw"}
                    quality={80}
                    className="hidden object-cover opacity-0 transition-opacity duration-700 lg:block lg:group-hover:opacity-100"
                  />
                )}
              </>
            ) : (
              <ImageFallback label={product.name} />
            )}
          </div>
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.badges.map((b) => (
            <span
              key={b}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em]",
                b === "sale" ? "bg-brand text-white" : b === "bestseller" ? "bg-ivory/95 text-brand" : "bg-sage text-white",
              )}
            >
              {BADGE_LABEL[b]}
            </span>
          ))}
          {product.isSample && (
            <span className="rounded-full bg-ink/70 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ivory backdrop-blur" title="Illustrative sample product — not a real Floriani listing">
              Sample
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => void toggleFavorite(product.id)}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `Remove ${product.name} from favourites` : `Add ${product.name} to favourites`}
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-ivory/90 text-ink shadow-sm backdrop-blur transition-all hover:scale-105 hover:text-brand"
        >
          <Heart className={cn("h-[18px] w-[18px] transition-colors", isFavorite && "fill-brand text-brand")} />
        </button>

        {product.purchasable ? (
          <>
            {/* Touch: always-visible round button. Desktop: full-width reveal on hover/focus. */}
            <button
              type="button"
              onClick={quickAdd}
              className="absolute bottom-3 right-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-lift transition-transform active:scale-95 lg:hidden"
              aria-label={`Add ${product.name} to bag`}
            >
              {added ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </button>
            <div className="absolute inset-x-3 bottom-3 z-10 hidden translate-y-3 opacity-0 transition-all duration-300 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 lg:block">
              <button
                type="button"
                onClick={quickAdd}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ivory/95 text-[13px] font-semibold tracking-wide text-ink shadow-lift backdrop-blur transition-colors hover:bg-brand hover:text-white"
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" /> Added
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Add to bag
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <span className="absolute inset-x-3 bottom-3 rounded-full bg-ivory/95 py-2.5 text-center text-[12.5px] font-semibold text-ink-soft backdrop-blur">
            Currently unavailable
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-4">
        {product.category && <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{product.category.name}</p>}
        <h3 className="mt-1 font-display text-[1.32rem] leading-tight text-ink">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-visible:underline">
            {product.name}
          </Link>
        </h3>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <Price amount={product.price} compareAt={product.compareAtPrice} currency={product.currency} />
          {product.lowStock !== null && <span className="text-[12px] font-medium text-warning">{product.availabilityLabel}</span>}
        </div>
      </div>
    </article>
  );
}
