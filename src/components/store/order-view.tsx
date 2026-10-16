"use client";

import Image from "next/image";
import { Link, useFormat, useT } from "@/i18n/client";
import { paymentMethodLabel, paymentStatusLabel, statusLabel } from "@/i18n/labels";
import { useState } from "react";
import { Check, Truck, Store, Banknote, CalendarDays, MapPin, Gift, MessageSquare, XCircle, AlertTriangle, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/components/store/status-tone";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Field, FormError, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { ImageFallback } from "@/components/store/image-fallback";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";
import { progressSteps, type OrderStatus } from "@/lib/domain/orders";
import { cn } from "@/lib/cn";
import type { CustomerOrderDTO } from "@/lib/types";

/** Customer-facing order details. Contains only customer-visible information. */
export function OrderView({
  order: initial,
  cancelUrl,
  cancelBody,
  canReview,
}: {
  order: CustomerOrderDTO;
  cancelUrl?: string;
  cancelBody?: unknown;
  canReview?: boolean;
}) {
  const [order, setOrder] = useState(initial);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reviewProduct, setReviewProduct] = useState<{ id: string; name: string } | null>(null);
  const t = useT();
  const f = useFormat();
  const fmtDateTime = (iso: string) => f.date(iso, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const label = statusLabel(t, order.status, order.fulfillment.type);
  const toast = useToast();
  const kind = order.fulfillment.type;
  const steps = progressSteps(kind);
  const currentIndex = steps.indexOf(order.status === "completed" && kind === "delivery" ? "delivered" : order.status);
  const isClosedBad = order.status === "cancelled" || order.status === "delivery_failed";

  const cancel = async () => {
    if (!cancelUrl) return;
    setCancelling(true);
    try {
      const updated = await api<CustomerOrderDTO>(cancelUrl, { body: cancelBody ?? {} });
      setOrder(updated);
      toast.success(t("order.cancelled"));
      setConfirmCancel(false);
    } catch (e) {
      toast.error(t("order.cancelFailed"), errorMessage(e));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-12">
      <div className="min-w-0 space-y-6">
        <section className="rounded-[1.5rem] border border-line bg-paper p-5 sm:p-7" aria-labelledby="status-h">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[13px] text-ink-muted">{t("order.number", { number: order.orderNumber })}</p>
              <h2 id="status-h" className="mt-1 font-display text-3xl text-ink">
                {label}
              </h2>
            </div>
            <Badge tone={statusTone(order.status)} dot>
              {label}
            </Badge>
          </div>

          {isClosedBad ? (
            <p className={cn("mt-6 flex items-start gap-2 rounded-xl px-4 py-3 text-sm", order.status === "cancelled" ? "bg-danger-50 text-danger" : "bg-warning-50 text-warning")}>
              {order.status === "cancelled" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
              {order.status === "cancelled"
                ? t("order.cancelledNotice")
                : t("order.failedNotice")}
            </p>
          ) : (
            <ol className="mt-8 grid gap-4 sm:flex sm:gap-0" aria-label={t("order.progress")}>
              {steps.map((s, i) => {
                const done = i <= currentIndex;
                const current = i === currentIndex;
                return (
                  <li key={s} className="relative flex items-center gap-3 sm:flex-1 sm:flex-col sm:gap-2 sm:text-center" aria-current={current ? "step" : undefined}>
                    {i < steps.length - 1 && (
                      <span aria-hidden="true" className={cn("absolute left-[15px] top-8 h-[calc(100%-8px)] w-0.5 sm:left-1/2 sm:top-[15px] sm:h-0.5 sm:w-full", i < currentIndex ? "bg-brand" : "bg-line")} />
                    )}
                    <span
                      className={cn(
                        "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                        done ? "border-brand bg-brand text-white" : "border-line-strong bg-paper text-ink-muted",
                        current && "ring-4 ring-brand/15",
                      )}
                    >
                      {done ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className={cn("text-[13px] sm:px-1", done ? "font-semibold text-ink" : "text-ink-muted")}>{statusLabel(t, s, kind)}</span>
                  </li>
                );
              })}
            </ol>
          )}

          {order.courier && order.status === "out_for_delivery" && (
            <p className="mt-6 flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand">
              <Truck className="h-4 w-4" /> {t("order.courierOnWay", { name: order.courier.name })}
            </p>
          )}

          {order.timeline.length > 0 && (
            <details className="group mt-6">
              <summary className="cursor-pointer list-none text-sm font-semibold text-brand hover:underline">{t("order.showHistory")}</summary>
              <ul className="mt-4 space-y-3 border-l-2 border-line pl-5">
                {[...order.timeline].reverse().map((e) => (
                  <li key={e.id} className="relative text-sm">
                    <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-paper bg-brand" aria-hidden="true" />
                    <p className="font-semibold text-ink">
                      {e.type === "created"
                        ? t("order.event.placed")
                        : e.type === "message"
                          ? t("order.event.message")
                          : e.type === "payment"
                            ? t("order.event.payment")
                            : statusLabel(t, e.to as OrderStatus, kind)}
                    </p>
                    {e.message && <p className="mt-0.5 text-ink-soft">{e.message}</p>}
                    <time className="text-xs text-ink-muted" dateTime={e.at}>
                      {fmtDateTime(e.at)}
                    </time>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section className="rounded-[1.5rem] border border-line bg-paper p-5 sm:p-7" aria-labelledby="items-h">
          <h2 id="items-h" className="font-display text-2xl text-ink">{t("order.items")}</h2>
          <ul className="mt-4 divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-4">
                <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-cream">
                  {item.image ? <Image src={item.image.src} alt={item.image.alt} fill sizes="64px" className="object-cover" /> : <ImageFallback />}
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${item.slug}`} className="font-semibold text-ink hover:text-brand">
                    {item.name}
                  </Link>
                  <p className="text-sm text-ink-muted tabular">
                    {item.quantity} × {f.money(item.unitPrice, order.currency)}
                  </p>
                  {canReview && order.reviewableProductIds.includes(item.productId) && (
                    <button type="button" onClick={() => setReviewProduct({ id: item.productId, name: item.name })} className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
                      <Star className="h-3.5 w-3.5" /> {t("review.write")}
                    </button>
                  )}
                </div>
                <span className="font-semibold tabular">{f.money(item.lineTotal, order.currency)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 space-y-2 border-t border-line pt-4 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-ink-soft">{t("cart.subtotal")}</dt>
              <dd className="tabular">{f.money(order.subtotal, order.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">{kind === "pickup" ? t("checkout.pickup") : t("checkout.delivery")}</dt>
              <dd className="tabular">{order.deliveryFee === 0 ? t("common.free") : f.money(order.deliveryFee, order.currency)}</dd>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-success">
                <dt>{t("cart.discount")}</dt>
                <dd className="tabular">−{f.money(order.discountTotal, order.currency)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold">
              <dt>{t("cart.total")}</dt>
              <dd className="tabular">{f.money(order.total, order.currency)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="space-y-5 rounded-[1.5rem] border border-line bg-paper p-6 text-sm">
          <InfoRow icon={kind === "pickup" ? Store : Truck} title={order.fulfillment.methodName}>
            {order.address ? (
              <>
                {[order.address.street, order.address.building && t("address.buildingShort", { value: order.address.building }), order.address.apartment && t("address.aptShort", { value: order.address.apartment })].filter(Boolean).join(", ")}
                <br />
                {[order.address.zone, order.address.city].filter(Boolean).join(", ")}
                {order.address.notes && <span className="mt-1 block text-ink-muted">{order.address.notes}</span>}
              </>
            ) : kind === "pickup" ? (
              order.pickupAddress || t("order.pickupAddressPending")
            ) : null}
          </InfoRow>
          <InfoRow icon={CalendarDays} title={f.dateKey(order.deliveryDate, { weekday: "long", day: "numeric", month: "long" })}>
            {order.timeWindow ? order.timeWindow.label : null}
          </InfoRow>
          {(order.recipient.name || order.recipient.phone) && (
            <InfoRow icon={MapPin} title={t("order.recipient")}>
              {order.recipient.name} {order.recipient.phone && <span className="block text-ink-muted">{order.recipient.phone}</span>}
            </InfoRow>
          )}
          <InfoRow icon={Banknote} title={paymentMethodLabel(t, order.paymentMethod)}>
            {paymentStatusLabel(t, order.paymentStatus)}
          </InfoRow>
          {order.giftMessage && (
            <InfoRow icon={Gift} title={t("product.giftMessage")}>
              <span className="italic">“{order.giftMessage}”</span>
            </InfoRow>
          )}
          {order.customerComment && (
            <InfoRow icon={MessageSquare} title={t("order.yourComment")}>
              {order.customerComment}
            </InfoRow>
          )}
        </div>
        {order.canCancel && cancelUrl && (
          <div className="rounded-[1.5rem] border border-line bg-paper p-6">
            <p className="text-sm text-ink-soft">{t("order.cancelHint")}</p>
            <Button variant="outline" className="mt-4 w-full" onClick={() => setConfirmCancel(true)}>
              {t("order.cancel")}
            </Button>
          </div>
        )}
        <p className="px-2 text-[12.5px] text-ink-muted">{t.rich("order.helpLine", { link: (c) => <Link href="/contact" className="text-brand hover:underline">{c}</Link> }, { date: fmtDateTime(order.createdAt), number: order.orderNumber })}</p>
      </aside>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={cancel}
        loading={cancelling}
        title={t("order.cancelConfirmTitle")}
        description={t("order.cancelConfirmText", { number: order.orderNumber })}
        confirmLabel={t("order.cancelConfirm")}
      />
      {reviewProduct && (
        <ReviewDialog
          product={reviewProduct}
          onClose={() => setReviewProduct(null)}
          onDone={() => {
            setOrder((o) => ({ ...o, reviewableProductIds: o.reviewableProductIds.filter((id) => id !== reviewProduct.id) }));
            setReviewProduct(null);
            toast.success(t("review.thanks"), t("review.pending"));
          }}
        />
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, title, children }: { icon: typeof Truck; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brand" />
      <div className="min-w-0">
        <p className="font-semibold text-ink">{title}</p>
        {children && <div className="mt-0.5 leading-relaxed text-ink-soft">{children}</div>}
      </div>
    </div>
  );
}

function ReviewDialog({ product, onClose, onDone }: { product: { id: string; name: string }; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/reviews", { body: { productId: product.id, rating, title, body } });
      onDone();
    } catch (e) {
      setError(errorMessage(e));
      setFields(fieldErrors(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("review.write")}
      description={product.name}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} loading={busy}>
            {t("review.submit")}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <FormError message={error} />
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-ink">{t("review.rating")}</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={t("review.stars", { count: n })} aria-pressed={rating === n} className="rounded p-1 text-brand">
                <Star className={cn("h-7 w-7", n <= rating ? "fill-current" : "opacity-30")} />
              </button>
            ))}
          </div>
        </fieldset>
        <Field id="rv-title" label={t("review.title")} optional>
          <input id="rv-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} className="h-12 w-full rounded-xl border border-line bg-paper px-4 focus:border-brand focus:outline-none" />
        </Field>
        <Field id="rv-body" label={t("review.body")} required error={fields.body}>
          <Textarea id="rv-body" value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} invalid={!!fields.body} />
        </Field>
        <p className="text-[12.5px] text-ink-muted">{t("review.note")}</p>
      </div>
    </Modal>
  );
}
