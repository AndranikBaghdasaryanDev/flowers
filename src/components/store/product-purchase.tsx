"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Heart, ShoppingBag, Gift, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { useCart } from "@/components/providers/cart-provider";
import { useSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/cn";
import { useT } from "@/i18n/client";
import type { ProductDetailDTO } from "@/lib/types";

export function ProductPurchase({ product }: { product: ProductDetailDTO }) {
  const cart = useCart();
  const t = useT();
  const { favorites, toggleFavorite } = useSession();
  const [qty, setQty] = useState(1);
  const [giftOpen, setGiftOpen] = useState(false);
  const [gift, setGift] = useState("");
  const [added, setAdded] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const mainBtn = useRef<HTMLDivElement>(null);
  const giftId = useId();
  const isFav = favorites.has(product.id);
  const inCart = cart.items.find((i) => i.productId === product.id)?.quantity ?? 0;
  const remaining = Math.max(0, product.maxQuantity - inCart);

  // Prefill the gift message stored in the bag once it is available (adjust-during-render pattern).
  const [giftPrefilled, setGiftPrefilled] = useState(false);
  if (!giftPrefilled && cart.ready) {
    setGiftPrefilled(true);
    if (cart.giftMessage && !gift) setGift(cart.giftMessage);
  }

  useEffect(() => {
    const el = mainBtn.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const addToBag = () => {
    if (!product.purchasable || remaining === 0) return;
    cart.add(product.id, Math.min(qty, remaining), {
      name: product.name,
      slug: product.slug,
      image: product.image,
      unitPrice: product.price,
      maxQuantity: product.maxQuantity,
    });
    if (gift.trim()) cart.setGiftMessage(gift.trim());
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
    cart.openDrawer();
  };

  const disabled = !product.purchasable || remaining === 0;
  const label = !product.purchasable ? t("product.unavailable") : remaining === 0 ? t("product.maxInBag") : added ? t("product.addedShort") : t("product.addToBag");

  return (
    <div>
      <div className="flex items-center gap-3">
        <Price amount={product.price} compareAt={product.compareAtPrice} currency={product.currency} size="lg" />
        {product.compareAtPrice && (
          <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            {t("product.save", { percent: Math.round((1 - product.price / product.compareAtPrice) * 100) })}
          </span>
        )}
      </div>
      <p className={cn("mt-2 flex items-center gap-2 text-sm font-medium", product.purchasable ? (product.lowStock !== null ? "text-warning" : "text-success") : "text-ink-muted")}>
        <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
        {product.purchasable ? (product.lowStock !== null ? t("product.onlyLeft", { count: product.lowStock }) : t("product.available")) : t("product.unavailable")}
      </p>

      {product.allowGiftMessage && product.purchasable && (
        <div className="mt-7 rounded-2xl border border-line bg-paper">
          <button
            type="button"
            aria-expanded={giftOpen}
            aria-controls={giftId}
            onClick={() => setGiftOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-ink"
          >
            <span className="flex items-center gap-2.5">
              <Gift className="h-[18px] w-[18px] text-brand" /> {t("product.addGiftMessage")}
            </span>
            <span className="text-xs font-medium text-ink-muted">{gift ? t("product.giftAdded") : t("common.optional")}</span>
          </button>
          <div id={giftId} hidden={!giftOpen} className="border-t border-line px-4 pb-4 pt-3">
            <label htmlFor={`${giftId}-text`} className="sr-only">
              {t("product.giftMessage")}
            </label>
            <textarea
              id={`${giftId}-text`}
              value={gift}
              onChange={(e) => setGift(e.target.value.slice(0, 500))}
              rows={3}
              placeholder={t("product.giftPlaceholder")}
              className="w-full resize-none rounded-xl border border-line bg-ivory px-3 py-2.5 text-[15px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
            />
            <p className="mt-1 text-right text-xs text-ink-muted tabular">{gift.length}/500</p>
          </div>
        </div>
      )}

      <div ref={mainBtn} className="mt-6 flex flex-wrap items-center gap-3">
        {product.purchasable && (
          <QuantityStepper value={Math.min(qty, Math.max(1, remaining))} onChange={setQty} max={Math.max(1, remaining)} disabled={disabled} />
        )}
        <Button size="lg" className="min-w-0 flex-1" onClick={addToBag} disabled={disabled} icon={added ? <Check className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}>
          {label}
        </Button>
        <button
          type="button"
          onClick={() => void toggleFavorite(product.id)}
          aria-pressed={isFav}
          aria-label={isFav ? t("product.removeFavoriteShort") : t("product.addFavoriteShort")}
          className="inline-flex h-13 w-13 items-center justify-center rounded-full border border-line-strong text-ink transition-colors hover:border-brand hover:text-brand"
        >
          <Heart className={cn("h-5 w-5", isFav && "fill-brand text-brand")} />
        </button>
      </div>
      {inCart > 0 && <p className="mt-3 text-[13px] text-ink-muted">{t("product.alreadyInBag", { count: inCart })}</p>}

      {/* Mobile sticky purchase bar — only when the main button has scrolled away. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ivory/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-md transition-transform duration-300 lg:hidden",
          showSticky ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!showSticky}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
            <Price amount={product.price} compareAt={product.compareAtPrice} currency={product.currency} size="sm" />
          </div>
          <Button onClick={addToBag} disabled={disabled} tabIndex={showSticky ? 0 : -1} icon={<ShoppingBag className="h-4 w-4" />}>
            {disabled ? t("product.unavailableShort") : t("product.add")}
          </Button>
        </div>
      </div>
    </div>
  );
}
