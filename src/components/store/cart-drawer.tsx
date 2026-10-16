"use client";

import Image from "next/image";
import Link from "next/link";
import { RouteChangeListener } from "@/components/route-change";
import { ShoppingBag, Trash2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { LinkButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/spinner";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { useCart } from "@/components/providers/cart-provider";
import { formatMoney } from "@/lib/domain/money";

export function CartDrawer() {
  const cart = useCart();
  const { closeDrawer } = cart;


  const quote = cart.quote;
  const hasIssues = quote?.lines.some((l) => l.status !== "ok");

  return (
    <>
    <RouteChangeListener onChange={closeDrawer} />
    <Modal
      open={cart.drawerOpen}
      onClose={cart.closeDrawer}
      side="right"
      title="Your bag"
      description={cart.count > 0 ? `${cart.count} ${cart.count === 1 ? "item" : "items"}` : undefined}
      footer={
        cart.items.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-soft">Subtotal</span>
              <span className="text-lg font-semibold tabular" aria-live="polite">
                {quote ? formatMoney(quote.subtotal, quote.currency) : <Skeleton className="inline-block h-5 w-24" />}
              </span>
            </div>
            <p className="text-[13px] text-ink-muted">Delivery options and fees are shown at checkout.</p>
            <div className="grid grid-cols-2 gap-2">
              <LinkButton href="/cart" variant="outline">
                View bag
              </LinkButton>
              <LinkButton href="/checkout" aria-disabled={hasIssues || undefined}>
                Checkout
              </LinkButton>
            </div>
          </div>
        ) : null
      }
    >
      {cart.items.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center py-16 text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand">
            <ShoppingBag className="h-7 w-7" />
          </span>
          <p className="font-display text-2xl">Your bag is empty</p>
          <p className="mt-2 max-w-xs text-sm text-ink-muted">Discover bouquets and arrangements composed by hand for every moment.</p>
          <LinkButton href="/shop" className="mt-6">
            Explore the shop
          </LinkButton>
        </div>
      ) : (
        <ul className="-my-2 divide-y divide-line">
          {cart.items.map((item) => {
            const line = quote?.lines.find((l) => l.productId === item.productId);
            const snap = cart.snapshots[item.productId];
            const name = line?.name ?? snap?.name ?? "Loading…";
            const image = line?.image ?? snap?.image ?? null;
            const slug = line?.slug ?? snap?.slug;
            const unavailable = line && (line.status === "unavailable" || line.status === "not_found");
            return (
              <li key={item.productId} className="flex gap-4 py-4">
                <Link href={slug ? `/products/${slug}` : "#"} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-cream">
                  {image && <Image src={image.src} alt={image.alt} fill sizes="80px" className="object-cover" />}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={slug ? `/products/${slug}` : "#"} className="font-semibold leading-snug text-ink hover:text-brand">
                      {name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => cart.remove(item.productId)}
                      className="-mr-1 -mt-1 rounded-full p-1.5 text-ink-muted hover:bg-cream hover:text-danger"
                      aria-label={`Remove ${name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-muted tabular">
                    {line && quote ? formatMoney(line.unitPrice, quote.currency) : snap && quote ? formatMoney(snap.unitPrice, quote.currency) : ""}
                  </p>
                  {line && line.status !== "ok" && (
                    <p className="mt-1 flex items-start gap-1.5 text-[13px] text-warning">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {line.message}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    {unavailable ? (
                      <span className="text-[13px] text-ink-muted">Not available</span>
                    ) : (
                      <QuantityStepper
                        size="sm"
                        value={item.quantity}
                        max={line?.maxQuantity || snap?.maxQuantity || 99}
                        onChange={(q) => cart.setQuantity(item.productId, q)}
                        label={`Quantity of ${name}`}
                      />
                    )}
                    {line && quote && <span className="font-semibold tabular">{formatMoney(line.lineTotal, quote.currency)}</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
    </>
  );
}
