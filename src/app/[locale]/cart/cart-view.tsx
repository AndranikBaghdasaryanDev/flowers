"use client";

import Image from "next/image";
import { Link } from "@/i18n/client";
import { useId } from "react";
import { AlertTriangle, ArrowRight, Gift, ShoppingBag, Trash2, ShieldCheck, RefreshCw } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { ImageFallback } from "@/components/store/image-fallback";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/spinner";
import { useFormat, useT } from "@/i18n/client";
import { cartLineMessage } from "@/components/store/cart-line-message";

export function CartView() {
  const cart = useCart();
  const t = useT();
  const f = useFormat();
  const giftId = useId();
  const quote = cart.quote;

  if (!cart.ready) {
    return (
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-6 w-6" />}
        title={t("cart.emptyTitle")}
        description={t("cart.emptyPageText")}
        action={<LinkButton href="/shop">{t("cart.exploreShop")}</LinkButton>}
      />
    );
  }

  const changed = cart.items
    .map((i) => ({ item: i, snap: cart.snapshots[i.productId], line: quote?.lines.find((l) => l.productId === i.productId) }))
    .filter(({ snap, line }) => line && snap?.addedPrice !== undefined && snap.addedPrice !== line.unitPrice && line.status !== "not_found");
  const problems = quote?.lines.filter((l) => l.status !== "ok") ?? [];
  const blocking = problems.some((l) => l.status === "unavailable" || l.status === "not_found");

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
      <div className="min-w-0">
        {(problems.length > 0 || changed.length > 0) && (
          <div role="status" className="mb-6 space-y-2 rounded-2xl border border-warning/25 bg-warning-50 p-4 text-sm text-warning">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" /> {t("cart.changedTitle")}
            </p>
            <ul className="list-disc space-y-1 pl-6 text-ink-soft">
              {problems.map((l) => (
                <li key={l.productId}>
                  <strong className="text-ink">{l.name}</strong>: {cartLineMessage(t, l)}
                </li>
              ))}
              {changed.map(({ line, snap }) => (
                <li key={line!.productId}>
                  <strong className="text-ink">{line!.name}</strong>: {t("cart.priceChanged", { from: f.money(snap!.addedPrice!, quote!.currency), to: f.money(line!.unitPrice, quote!.currency) })}
                </li>
              ))}
            </ul>
            {changed.length > 0 && (
              <button type="button" onClick={cart.acknowledgePrices} className="text-[13px] font-semibold text-brand hover:underline">
                {t("cart.acceptPrices")}
              </button>
            )}
          </div>
        )}

        <ul className="divide-y divide-line border-y border-line">
          {cart.items.map((item) => {
            const line = quote?.lines.find((l) => l.productId === item.productId);
            const snap = cart.snapshots[item.productId];
            const name = line?.name ?? snap?.name ?? t("common.loading");
            const image = line?.image ?? snap?.image ?? null;
            const slug = line?.slug || snap?.slug;
            const unavailable = line?.status === "unavailable" || line?.status === "not_found";
            return (
              <li key={item.productId} className="flex gap-4 py-6 sm:gap-6">
                <Link href={slug ? `/products/${slug}` : "/shop"} className="relative h-32 w-26 shrink-0 overflow-hidden rounded-2xl bg-cream sm:h-36 sm:w-28">
                  {image ? <Image src={image.src} alt={image.alt} fill sizes="112px" className="object-cover" /> : <ImageFallback />}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={slug ? `/products/${slug}` : "/shop"} className="font-display text-xl leading-tight text-ink hover:text-brand sm:text-2xl">
                        {name}
                      </Link>
                      <p className="mt-1 text-sm text-ink-muted tabular">
                        {line && quote ? t("cart.each", { price: f.money(line.unitPrice, quote.currency) }) : <Skeleton className="inline-block h-4 w-20" />}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => cart.remove(item.productId)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-cream hover:text-danger"
                      aria-label={t("cart.removeItem", { name })}
                    >
                      <Trash2 className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                  {line && line.status !== "ok" && <p className="mt-2 text-[13px] font-medium text-warning">{cartLineMessage(t, line)}</p>}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                    {unavailable ? (
                      <Button variant="outline" size="sm" onClick={() => cart.remove(item.productId)}>
                        {t("cart.remove")}
                      </Button>
                    ) : (
                      <QuantityStepper
                        size="sm"
                        value={item.quantity}
                        max={line?.maxQuantity || snap?.maxQuantity || 99}
                        onChange={(q) => cart.setQuantity(item.productId, q)}
                        label={t("cart.quantityOf", { name })}
                      />
                    )}
                    <span className="text-lg font-semibold text-ink tabular">{line && quote ? f.money(line.lineTotal, quote.currency) : ""}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 rounded-2xl border border-line bg-paper p-5">
          <label htmlFor={giftId} className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Gift className="h-4 w-4 text-brand" /> {t("product.giftMessage")} <span className="font-normal text-ink-muted">({t("common.optionalLower")})</span>
          </label>
          <textarea
            id={giftId}
            value={cart.giftMessage}
            onChange={(e) => cart.setGiftMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t("cart.giftPlaceholder")}
            className="mt-3 w-full resize-none rounded-xl border border-line bg-ivory px-4 py-3 text-[15px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
          />
          <p className="mt-1 text-right text-xs text-ink-muted tabular">{cart.giftMessage.length}/500</p>
        </div>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start" aria-label={t("cart.summaryLabel")}>
        <div className="rounded-[1.5rem] border border-line bg-paper p-6">
          <h2 className="font-display text-2xl text-ink">{t("cart.summary")}</h2>
          <dl className="mt-5 space-y-3 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-ink-soft">{t("cart.itemsCount", { count: cart.count })}</dt>
              <dd className="font-semibold tabular">{quote ? f.money(quote.subtotal, quote.currency) : <Skeleton className="h-5 w-20" />}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">{t("checkout.delivery")}</dt>
              <dd className="text-ink-muted">{t("cart.calculatedAtCheckout")}</dd>
            </div>
          </dl>
          <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
            <span className="font-semibold text-ink">{t("cart.subtotal")}</span>
            <span className="text-2xl font-semibold text-ink tabular">{quote ? f.money(quote.subtotal, quote.currency) : "—"}</span>
          </div>
          {cart.quoteError && (
            <p className="mt-4 flex items-center justify-between gap-2 text-sm text-danger">
              {t("cart.refreshFailed")}
              <button type="button" onClick={cart.refreshQuote} className="inline-flex items-center gap-1 font-semibold underline">
                <RefreshCw className="h-3.5 w-3.5" /> {t("common.retry")}
              </button>
            </p>
          )}
          {blocking ? (
            <p className="mt-6 rounded-xl bg-cream px-4 py-3 text-sm text-ink-soft">{t("cart.removeUnavailable")}</p>
          ) : (
            <LinkButton href="/checkout" size="lg" className="mt-6 w-full" icon={<ArrowRight className="h-5 w-5" />}>
              {t("cart.proceed")}
            </LinkButton>
          )}
          <Link href="/shop" className="mt-4 block text-center text-sm font-semibold text-ink-soft hover:text-brand">
            {t("cart.continueShopping")}
          </Link>
          <p className="mt-6 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sage" /> {t("cart.trustNote")}
          </p>
        </div>
      </aside>
    </div>
  );
}
