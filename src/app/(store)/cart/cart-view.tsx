"use client";

import Image from "next/image";
import Link from "next/link";
import { useId } from "react";
import { AlertTriangle, ArrowRight, Gift, ShoppingBag, Trash2, ShieldCheck, RefreshCw } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { ImageFallback } from "@/components/store/image-fallback";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/spinner";
import { formatMoney } from "@/lib/domain/money";

export function CartView() {
  const cart = useCart();
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
        title="Your bag is empty"
        description="Find a bouquet or arrangement that says exactly what you mean."
        action={<LinkButton href="/shop">Explore the shop</LinkButton>}
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
              <AlertTriangle className="h-4 w-4" /> Some items have changed since you added them
            </p>
            <ul className="list-disc space-y-1 pl-6 text-ink-soft">
              {problems.map((l) => (
                <li key={l.productId}>
                  <strong className="text-ink">{l.name}</strong>: {l.message}
                </li>
              ))}
              {changed.map(({ line, snap }) => (
                <li key={line!.productId}>
                  <strong className="text-ink">{line!.name}</strong>: price changed from {formatMoney(snap!.addedPrice!, quote!.currency)} to{" "}
                  {formatMoney(line!.unitPrice, quote!.currency)}.
                </li>
              ))}
            </ul>
            {changed.length > 0 && (
              <button type="button" onClick={cart.acknowledgePrices} className="text-[13px] font-semibold text-brand hover:underline">
                OK, continue with the new prices
              </button>
            )}
          </div>
        )}

        <ul className="divide-y divide-line border-y border-line">
          {cart.items.map((item) => {
            const line = quote?.lines.find((l) => l.productId === item.productId);
            const snap = cart.snapshots[item.productId];
            const name = line?.name ?? snap?.name ?? "Loading…";
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
                        {line && quote ? `${formatMoney(line.unitPrice, quote.currency)} each` : <Skeleton className="inline-block h-4 w-20" />}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => cart.remove(item.productId)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-cream hover:text-danger"
                      aria-label={`Remove ${name} from bag`}
                    >
                      <Trash2 className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                  {line && line.status !== "ok" && <p className="mt-2 text-[13px] font-medium text-warning">{line.message}</p>}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                    {unavailable ? (
                      <Button variant="outline" size="sm" onClick={() => cart.remove(item.productId)}>
                        Remove
                      </Button>
                    ) : (
                      <QuantityStepper
                        size="sm"
                        value={item.quantity}
                        max={line?.maxQuantity || snap?.maxQuantity || 99}
                        onChange={(q) => cart.setQuantity(item.productId, q)}
                        label={`Quantity of ${name}`}
                      />
                    )}
                    <span className="text-lg font-semibold text-ink tabular">{line && quote ? formatMoney(line.lineTotal, quote.currency) : ""}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 rounded-2xl border border-line bg-paper p-5">
          <label htmlFor={giftId} className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Gift className="h-4 w-4 text-brand" /> Gift message <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            id={giftId}
            value={cart.giftMessage}
            onChange={(e) => cart.setGiftMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="We will handwrite your words on a card and include it with the flowers."
            className="mt-3 w-full resize-none rounded-xl border border-line bg-ivory px-4 py-3 text-[15px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
          />
          <p className="mt-1 text-right text-xs text-ink-muted tabular">{cart.giftMessage.length}/500</p>
        </div>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start" aria-label="Order summary">
        <div className="rounded-[1.5rem] border border-line bg-paper p-6">
          <h2 className="font-display text-2xl text-ink">Summary</h2>
          <dl className="mt-5 space-y-3 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Items ({cart.count})</dt>
              <dd className="font-semibold tabular">{quote ? formatMoney(quote.subtotal, quote.currency) : <Skeleton className="h-5 w-20" />}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Delivery</dt>
              <dd className="text-ink-muted">Calculated at checkout</dd>
            </div>
          </dl>
          <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
            <span className="font-semibold text-ink">Subtotal</span>
            <span className="text-2xl font-semibold text-ink tabular">{quote ? formatMoney(quote.subtotal, quote.currency) : "—"}</span>
          </div>
          {cart.quoteError && (
            <p className="mt-4 flex items-center justify-between gap-2 text-sm text-danger">
              Prices could not be refreshed.
              <button type="button" onClick={cart.refreshQuote} className="inline-flex items-center gap-1 font-semibold underline">
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </p>
          )}
          {blocking ? (
            <p className="mt-6 rounded-xl bg-cream px-4 py-3 text-sm text-ink-soft">Remove unavailable items to continue.</p>
          ) : (
            <LinkButton href="/checkout" size="lg" className="mt-6 w-full" icon={<ArrowRight className="h-5 w-5" />}>
              Proceed to checkout
            </LinkButton>
          )}
          <Link href="/shop" className="mt-4 block text-center text-sm font-semibold text-ink-soft hover:text-brand">
            Continue shopping
          </Link>
          <p className="mt-6 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sage" /> Prices are confirmed on our side when you place the order. You pay on delivery or at pickup.
          </p>
        </div>
      </aside>
    </div>
  );
}
