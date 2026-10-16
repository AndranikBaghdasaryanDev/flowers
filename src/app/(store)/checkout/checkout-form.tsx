"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Truck, Store, Banknote, Lock, AlertTriangle, CalendarDays, Clock, Gift, MapPin, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { useSession } from "@/components/providers/session-provider";
import { Button, LinkButton } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, RadioCard, Select, Textarea, describedBy } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, Spinner } from "@/components/ui/spinner";
import { api, ApiClientError, errorMessage, newIdempotencyKey } from "@/lib/client/api";
import { formatMoney, type CurrencyCode } from "@/lib/domain/money";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/domain/orders";
import { formatDateKey } from "@/lib/domain/time";
import { cn } from "@/lib/cn";
import type { DeliveryMethodDTO, QuoteDTO } from "@/lib/types";

type Method = DeliveryMethodDTO & { schedule: { date: string; windows: string[] }[] };
type MethodsResponse = {
  timeZone: string;
  currency: CurrencyCode;
  payment: { cashOnDelivery: boolean; cashOnPickup: boolean };
  guestCheckout: boolean;
  orderNotice: string;
  methods: Method[];
};
type SavedAddress = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  city: string;
  zone: string;
  street: string;
  building: string;
  apartment: string;
  entrance: string;
  floor: string;
  notes: string;
  isDefault: boolean;
};

const KEY_STORAGE = "ff_checkout_key";
const emptyAddress = { city: "", zone: "", street: "", building: "", apartment: "", entrance: "", floor: "", notes: "" };

function getIdempotencyKey(): string {
  try {
    const existing = sessionStorage.getItem(KEY_STORAGE);
    if (existing) return existing;
    const key = newIdempotencyKey();
    sessionStorage.setItem(KEY_STORAGE, key);
    return key;
  } catch {
    return newIdempotencyKey();
  }
}

export function CheckoutForm() {
  const router = useRouter();
  const cart = useCart();
  const { user, status: sessionStatus } = useSession();

  const [config, setConfig] = useState<MethodsResponse | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);

  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [forSomeoneElse, setForSomeoneElse] = useState(false);
  const [recipient, setRecipient] = useState({ name: "", phone: "" });
  const [methodId, setMethodId] = useState("");
  const [addressDraft, setAddress] = useState(emptyAddress);
  const [savedAddressId, setSavedAddressId] = useState<string>("");
  const [chosenDate, setDate] = useState("");
  const [chosenWindow, setTimeWindow] = useState("");
  const [comment, setComment] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [quote, setQuote] = useState<QuoteDTO | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const loadConfig = useCallback(() => {
    api<MethodsResponse>("/api/delivery/methods")
      .then((c) => {
        setConfig(c);
        setMethodId((prev) => prev || c.methods[0]?.id || "");
      })
      .catch((e) => setConfigError(errorMessage(e)));
  }, []);

  useEffect(() => loadConfig(), [loadConfig]);

  // Prefill contact details from the signed-in account (once per account).
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  if (user && prefilledFor !== user.id) {
    setPrefilledFor(user.id);
    setCustomer((c) => ({ name: c.name || user.name, email: c.email || user.email, phone: c.phone || user.phone }));
  }

  // Saved addresses for signed-in customers.
  useEffect(() => {
    if (!user) return;
    api<SavedAddress[]>("/api/account/addresses")
      .then((list) => {
        setAddresses(list);
        const def = list.find((a) => a.isDefault) ?? list[0];
        if (def) applySaved(def);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const method = config?.methods.find((m) => m.id === methodId) ?? null;
  const currency = config?.currency ?? quote?.currency ?? "AMD";

  // The chosen date/window/city always stay valid for the selected method (derived, not synced).
  const date = method && method.schedule.some((d) => d.date === chosenDate) ? chosenDate : (method?.schedule[0]?.date ?? "");
  const day = method?.schedule.find((d) => d.date === date);
  const timeWindow = day ? (day.windows.includes(chosenWindow) ? chosenWindow : (day.windows[0] ?? "")) : "";
  const address = method?.city ? { ...addressDraft, city: method.city } : addressDraft;

  // Server quote including the delivery fee for the selected method and area.
  const itemsKey = JSON.stringify(cart.items);
  useEffect(() => {
    if (!cart.ready || cart.items.length === 0) return;
    const controller = new AbortController();
    const t = window.setTimeout(() => {
      setQuoteLoading(true);
      api<QuoteDTO>("/api/cart/quote", {
        body: { items: cart.items, deliveryMethodId: methodId || undefined, zone: method?.type === "delivery" ? address.zone : "" },
        signal: controller.signal,
      })
        .then(setQuote)
        .catch(() => undefined)
        .finally(() => !controller.signal.aborted && setQuoteLoading(false));
    }, 150);
    return () => {
      controller.abort();
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, cart.ready, methodId, address.zone]);

  function applySaved(a: SavedAddress) {
    setSavedAddressId(a.id);
    setAddress({ city: a.city, zone: a.zone, street: a.street, building: a.building, apartment: a.apartment, entrance: a.entrance, floor: a.floor, notes: a.notes });
    if (user && a.recipientName && a.recipientName !== user.name) {
      setForSomeoneElse(true);
      setRecipient({ name: a.recipientName, phone: a.phone });
    }
  }

  const paymentMethod: PaymentMethod | null = method ? (method.type === "pickup" ? "cash_on_pickup" : "cash_on_delivery") : null;
  const paymentEnabled = paymentMethod && config ? (paymentMethod === "cash_on_delivery" ? config.payment.cashOnDelivery : config.payment.cashOnPickup) : false;

  const quoteProblems = quote?.lines.filter((l) => l.status !== "ok") ?? [];
  const canSubmit = Boolean(quote && quote.itemCount > 0 && quoteProblems.length === 0 && quote.deliveryFee !== null && quote.issues.length === 0 && paymentEnabled);

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (customer.name.trim().length < 2) e["customer.name"] = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(customer.email.trim())) e["customer.email"] = "Enter a valid email address.";
    if ((customer.phone.match(/\d/g)?.length ?? 0) < 7) e["customer.phone"] = "Enter a valid phone number.";
    if (forSomeoneElse && recipient.name.trim().length < 2) e["recipient.name"] = "Enter the recipient's name.";
    if (!method) e.deliveryMethodId = "Choose delivery or pickup.";
    if (method?.type === "delivery") {
      if (address.city.trim().length < 2) e["address.city"] = "Enter the city.";
      if (method.zones.length > 0 && !address.zone) e["address.zone"] = "Choose the delivery area.";
      if (address.street.trim().length < 2) e["address.street"] = "Enter the street address.";
    }
    if (!date) e.deliveryDate = "Choose a date.";
    if (method && method.timeWindows.length > 0 && !timeWindow) e.timeWindow = "Choose a time window.";
    if (!acceptTerms) e.acceptTerms = "Please accept the terms and conditions.";
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (submitting) return;
    setFormError(null);
    const clientErrors = validate();
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      setFormError("Please check the highlighted fields.");
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    if (!quote || !paymentMethod) return;
    setSubmitting(true);
    try {
      const result = await api<{ order: { orderNumber: string; id: string }; trackingToken: string }>("/api/checkout", {
        body: {
          idempotencyKey: getIdempotencyKey(),
          items: cart.items,
          customer,
          recipient: forSomeoneElse ? recipient : { name: "", phone: "" },
          deliveryMethodId: methodId,
          address: method?.type === "delivery" ? address : null,
          deliveryDate: date,
          timeWindow,
          paymentMethod,
          giftMessage: cart.giftMessage,
          customerComment: comment,
          expectedTotal: quote.total,
          acceptTerms: true,
        },
      });
      try {
        sessionStorage.removeItem(KEY_STORAGE);
      } catch {
        // ignore
      }
      cart.clear();
      router.replace(`/checkout/success?order=${encodeURIComponent(result.order.orderNumber)}&token=${encodeURIComponent(result.trackingToken)}`);
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiClientError) {
        setErrors(err.fields);
        setFormError(err.message);
        if (err.status === 409) {
          // Cart or prices changed on the server: refresh everything the customer sees.
          cart.refreshQuote();
          loadConfig();
          setQuote((err.meta.quote as QuoteDTO | undefined) ?? quote);
        }
        if (err.status === 401) setFormError("Please sign in to place your order. Your bag has been kept.");
      } else {
        setFormError(errorMessage(err));
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /* ------------------------------- states -------------------------------- */

  if (!cart.ready || sessionStatus === "loading") {
    return <CheckoutSkeleton />;
  }
  if (cart.items.length === 0 && !submitting) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-6 w-6" />}
        title="Your bag is empty"
        description="Add something beautiful before checking out."
        action={<LinkButton href="/shop">Explore the shop</LinkButton>}
      />
    );
  }
  if (configError) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-6 w-6" />}
        title="Checkout is temporarily unavailable"
        description={configError}
        action={
          <Button
            onClick={() => {
              setConfigError(null);
              loadConfig();
            }}
          >
            Try again
          </Button>
        }
      />
    );
  }
  if (!config) return <CheckoutSkeleton />;
  if (!user && !config.guestCheckout) {
    return (
      <EmptyState
        icon={<Lock className="h-6 w-6" />}
        title="Please sign in to check out"
        description="Your bag will be waiting for you."
        action={
          <div className="flex gap-3">
            <LinkButton href="/login?next=/checkout">Sign in</LinkButton>
            <LinkButton href="/register?next=/checkout" variant="outline">
              Create account
            </LinkButton>
          </div>
        }
      />
    );
  }
  if (config.methods.length === 0) {
    return (
      <EmptyState
        icon={<Truck className="h-6 w-6" />}
        title="Ordering is paused"
        description="Delivery and pickup are not available online right now. Please contact us to place an order."
        action={<LinkButton href="/contact">Contact us</LinkButton>}
      />
    );
  }

  const err = (k: string) => errors[k];
  const section = "rounded-[1.5rem] border border-line bg-paper p-5 sm:p-7";
  const stepTitle = (n: number, t: string) => (
    <h2 className="flex items-center gap-3 font-display text-2xl text-ink">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-sans font-bold text-white">{n}</span>
      {t}
    </h2>
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[1fr_400px] lg:gap-12">
      <div className="min-w-0 space-y-6">
        <FormError message={formError} />
        {config.orderNotice && <p className="rounded-2xl border border-info/20 bg-info-50 px-4 py-3 text-sm text-info">{config.orderNotice}</p>}
        {!user && (
          <p className="text-sm text-ink-soft">
            Have an account?{" "}
            <Link href="/login?next=/checkout" className="font-semibold text-brand hover:underline">
              Sign in
            </Link>{" "}
            to use saved addresses and track orders in one place.
          </p>
        )}

        <section className={section} aria-labelledby="s1">
          <div id="s1">{stepTitle(1, "Your details")}</div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field id="c-name" label="Full name" required error={err("customer.name")} className="sm:col-span-2">
              <Input id="c-name" autoComplete="name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} invalid={!!err("customer.name")} aria-describedby={describedBy("c-name", err("customer.name"))} />
            </Field>
            <Field id="c-email" label="Email" required error={err("customer.email")} hint="For your order confirmation.">
              <Input id="c-email" type="email" autoComplete="email" inputMode="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} invalid={!!err("customer.email")} aria-describedby={describedBy("c-email", err("customer.email"), "x")} />
            </Field>
            <Field id="c-phone" label="Phone" required error={err("customer.phone")} hint="We call only if needed.">
              <Input id="c-phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+374 …" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} invalid={!!err("customer.phone")} aria-describedby={describedBy("c-phone", err("customer.phone"), "x")} />
            </Field>
          </div>
        </section>

        <section className={section} aria-labelledby="s2">
          <div id="s2">{stepTitle(2, "Delivery or pickup")}</div>
          <div className="mt-6 grid gap-3" role="radiogroup" aria-label="Fulfilment method">
            {config.methods.map((m) => {
              const minFee = m.zones.length ? Math.min(...m.zones.map((z) => z.fee ?? m.fee)) : m.fee;
              return (
                <RadioCard
                  key={m.id}
                  name="method"
                  value={m.id}
                  checked={methodId === m.id}
                  onChange={setMethodId}
                  icon={m.type === "pickup" ? <Store className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                  title={m.name}
                  aside={minFee === 0 ? "Free" : `${m.zones.some((z) => z.fee !== null && z.fee !== m.fee) ? "from " : ""}${formatMoney(minFee, currency)}`}
                  description={[m.description, m.estimatedTime, m.freeOverAmount !== null ? `Free from ${formatMoney(m.freeOverAmount, currency)}.` : ""].filter(Boolean).join(" ")}
                  disabled={m.schedule.length === 0}
                />
              );
            })}
          </div>
          {err("deliveryMethodId") && <p className="mt-2 text-[13px] text-danger">{err("deliveryMethodId")}</p>}

          {method?.type === "pickup" && (
            <p className="mt-5 flex items-start gap-2 rounded-xl bg-cream px-4 py-3 text-sm text-ink-soft">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              {method.pickupAddress ? <>Pickup address: <strong className="ml-1 text-ink">{method.pickupAddress}</strong></> : "We will confirm the pickup address when we confirm your order."}
            </p>
          )}

          {method?.type === "delivery" && (
            <div className="mt-7 space-y-5">
              <Checkbox
                id="for-someone"
                checked={forSomeoneElse}
                onChange={(e) => setForSomeoneElse(e.target.checked)}
                label="I'm sending flowers to someone else"
                description="We will contact the recipient only if needed for delivery."
              />
              {forSomeoneElse && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="r-name" label="Recipient's name" required error={err("recipient.name")}>
                    <Input id="r-name" value={recipient.name} onChange={(e) => setRecipient({ ...recipient, name: e.target.value })} invalid={!!err("recipient.name")} />
                  </Field>
                  <Field id="r-phone" label="Recipient's phone" optional error={err("recipient.phone")}>
                    <Input id="r-phone" type="tel" inputMode="tel" value={recipient.phone} onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })} invalid={!!err("recipient.phone")} />
                  </Field>
                </div>
              )}

              {addresses.length > 0 && (
                <Field id="saved" label="Saved addresses">
                  <Select
                    id="saved"
                    value={savedAddressId}
                    onChange={(e) => {
                      const a = addresses.find((x) => x.id === e.target.value);
                      if (a) applySaved(a);
                      else {
                        setSavedAddressId("");
                        setAddress({ ...emptyAddress, city: method.city });
                      }
                    }}
                  >
                    <option value="">New address</option>
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {[a.label, a.street, a.building].filter(Boolean).join(", ")}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              <div className="grid gap-4 sm:grid-cols-6">
                <Field id="a-city" label="City" required error={err("address.city")} className="sm:col-span-3">
                  <Input id="a-city" autoComplete="address-level2" value={address.city} readOnly={Boolean(method.city)} onChange={(e) => setAddress({ ...address, city: e.target.value })} invalid={!!err("address.city")} className={method.city ? "bg-cream" : ""} />
                </Field>
                {method.zones.length > 0 && (
                  <Field id="a-zone" label="Area / district" required error={err("address.zone")} className="sm:col-span-3">
                    <Select id="a-zone" value={address.zone} onChange={(e) => setAddress({ ...address, zone: e.target.value })} invalid={!!err("address.zone")}>
                      <option value="">Choose…</option>
                      {method.zones.map((z) => (
                        <option key={z.name} value={z.name}>
                          {z.name}
                          {z.fee !== null && z.fee !== method.fee ? ` — ${formatMoney(z.fee, currency)}` : ""}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                <Field id="a-street" label="Street address" required error={err("address.street")} className="sm:col-span-4">
                  <Input id="a-street" autoComplete="address-line1" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} invalid={!!err("address.street")} />
                </Field>
                <Field id="a-building" label="Building" optional className="sm:col-span-2">
                  <Input id="a-building" value={address.building} onChange={(e) => setAddress({ ...address, building: e.target.value })} />
                </Field>
                <Field id="a-apt" label="Apartment" optional className="sm:col-span-2">
                  <Input id="a-apt" autoComplete="address-line2" value={address.apartment} onChange={(e) => setAddress({ ...address, apartment: e.target.value })} />
                </Field>
                <Field id="a-entrance" label="Entrance" optional className="sm:col-span-2">
                  <Input id="a-entrance" value={address.entrance} onChange={(e) => setAddress({ ...address, entrance: e.target.value })} />
                </Field>
                <Field id="a-floor" label="Floor" optional className="sm:col-span-2">
                  <Input id="a-floor" value={address.floor} onChange={(e) => setAddress({ ...address, floor: e.target.value })} />
                </Field>
                <Field id="a-notes" label="Directions for the courier" optional className="sm:col-span-6">
                  <Input id="a-notes" value={address.notes} maxLength={300} placeholder="Intercom code, landmarks…" onChange={(e) => setAddress({ ...address, notes: e.target.value })} />
                </Field>
              </div>
            </div>
          )}
        </section>

        {method && (
          <section className={section} aria-labelledby="s3">
            <div id="s3">{stepTitle(3, method.type === "pickup" ? "Pickup date" : "Delivery date")}</div>
            {method.schedule.length === 0 ? (
              <p className="mt-5 text-sm text-ink-muted">There are no available dates for this option right now.</p>
            ) : (
              <>
                <fieldset className="mt-6">
                  <legend className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <CalendarDays className="h-4 w-4 text-brand" /> Date
                  </legend>
                  <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
                    {method.schedule.slice(0, 21).map((d) => {
                      const active = d.date === date;
                      const [, , dd] = d.date.split("-");
                      return (
                        <button
                          key={d.date}
                          type="button"
                          onClick={() => setDate(d.date)}
                          aria-pressed={active}
                          className={cn(
                            "flex w-[68px] shrink-0 snap-start flex-col items-center rounded-2xl border py-2.5 transition-all",
                            active ? "border-brand bg-brand text-white shadow-lift" : "border-line bg-ivory text-ink hover:border-brand",
                          )}
                        >
                          <span className={cn("text-[11px] font-semibold uppercase tracking-wider", active ? "text-white/80" : "text-ink-muted")}>
                            {formatDateKey(d.date, { weekday: "short" })}
                          </span>
                          <span className="font-display text-2xl leading-tight">{Number(dd)}</span>
                          <span className={cn("text-[11px]", active ? "text-white/80" : "text-ink-muted")}>{formatDateKey(d.date, { month: "short" })}</span>
                        </button>
                      );
                    })}
                  </div>
                  {err("deliveryDate") && <p className="mt-1 text-[13px] text-danger">{err("deliveryDate")}</p>}
                </fieldset>
                {day && day.windows.length > 0 && (
                  <fieldset className="mt-6">
                    <legend className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-ink">
                      <Clock className="h-4 w-4 text-brand" /> Time window
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {day.windows.map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setTimeWindow(w)}
                          aria-pressed={timeWindow === w}
                          className={cn(
                            "rounded-full border px-4 py-2.5 text-sm font-semibold tabular transition-colors",
                            timeWindow === w ? "border-brand bg-brand-50 text-brand" : "border-line text-ink-soft hover:border-brand",
                          )}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                    {err("timeWindow") && <p className="mt-2 text-[13px] text-danger">{err("timeWindow")}</p>}
                  </fieldset>
                )}
                <p className="mt-5 text-[13px] text-ink-muted">Dates and times are in the shop’s local time ({config.timeZone.replace("_", " ")}).</p>
              </>
            )}
          </section>
        )}

        <section className={section} aria-labelledby="s4">
          <div id="s4">{stepTitle(4, "Message & notes")}</div>
          <div className="mt-6 space-y-4">
            <Field id="gift" label={<span className="flex items-center gap-2"><Gift className="h-4 w-4 text-brand" /> Gift card message</span>} optional hint={`${cart.giftMessage.length}/500 — we handwrite it on a card.`}>
              <Textarea id="gift" rows={3} maxLength={500} value={cart.giftMessage} onChange={(e) => cart.setGiftMessage(e.target.value)} />
            </Field>
            <Field id="comment" label="Comment for the florist" optional hint="Colour wishes, allergies, anything we should know.">
              <Textarea id="comment" rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
            </Field>
          </div>
        </section>

        <section className={section} aria-labelledby="s5">
          <div id="s5">{stepTitle(5, "Payment")}</div>
          <div className="mt-6">
            {paymentMethod && paymentEnabled ? (
              <RadioCard
                name="payment"
                value={paymentMethod}
                checked
                onChange={() => undefined}
                icon={<Banknote className="h-5 w-5" />}
                title={PAYMENT_METHOD_LABELS[paymentMethod]}
                description={paymentMethod === "cash_on_delivery" ? "Pay the courier when your flowers arrive." : "Pay when you collect your order."}
              />
            ) : (
              <p className="rounded-xl bg-warning-50 px-4 py-3 text-sm text-warning">No payment method is available for this option. Please choose another or contact us.</p>
            )}
            <p className="mt-3 text-[13px] text-ink-muted">Online card payment is not available yet. We never ask for card details.</p>
          </div>
          <div className="mt-6">
            <Checkbox
              id="terms"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              aria-invalid={!!err("acceptTerms") || undefined}
              label={
                <>
                  I accept the{" "}
                  <Link href="/legal/terms" target="_blank" className="text-brand underline">
                    terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/legal/privacy" target="_blank" className="text-brand underline">
                    privacy policy
                  </Link>
                </>
              }
            />
            {err("acceptTerms") && <p className="mt-2 text-[13px] text-danger">{err("acceptTerms")}</p>}
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start" aria-label="Order summary">
        <div className="rounded-[1.5rem] border border-line bg-paper p-6">
          <h2 className="font-display text-2xl text-ink">Your order</h2>
          <ul className="mt-5 max-h-[320px] space-y-4 overflow-y-auto pr-1">
            {(quote?.lines ?? []).map((l) => (
              <li key={l.productId} className="flex gap-3">
                <span className="relative h-16 w-13 shrink-0 overflow-hidden rounded-xl bg-cream">
                  {l.image && <Image src={l.image.src} alt="" fill sizes="56px" className="object-cover" />}
                  <span className="absolute -right-0 -top-0 flex h-5 min-w-5 items-center justify-center rounded-bl-lg bg-ink px-1 text-[11px] font-bold text-ivory">{l.quantity}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{l.name}</span>
                  {l.status !== "ok" && <span className="block text-[12px] text-warning">{l.message}</span>}
                </span>
                <span className="text-sm font-semibold tabular">{formatMoney(l.lineTotal, quote!.currency)}</span>
              </li>
            ))}
            {!quote && [0, 1].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </ul>
          <dl className="mt-5 space-y-2.5 border-t border-line pt-5 text-[15px]" aria-live="polite">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Subtotal</dt>
              <dd className="tabular">{quote ? formatMoney(quote.subtotal, quote.currency) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">{method?.type === "pickup" ? "Pickup" : "Delivery"}</dt>
              <dd className="text-right tabular">
                {quoteLoading ? <Spinner className="h-4 w-4 text-brand" /> : quote?.deliveryFee === null || quote?.deliveryFee === undefined ? <span className="text-[13px] text-ink-muted">{quote?.deliveryMessage || "Choose an option"}</span> : quote.deliveryFee === 0 ? "Free" : formatMoney(quote.deliveryFee, quote.currency)}
              </dd>
            </div>
            {quote && quote.discountTotal > 0 && (
              <div className="flex justify-between text-success">
                <dt>Discount</dt>
                <dd className="tabular">−{formatMoney(quote.discountTotal, quote.currency)}</dd>
              </div>
            )}
          </dl>
          {quote?.deliveryMessage && quote.deliveryFee !== null && <p className="mt-2 text-[12.5px] text-sage-700">{quote.deliveryMessage}</p>}
          <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
            <span className="font-semibold">Total</span>
            <span className="text-2xl font-semibold tabular">{quote ? formatMoney(quote.total, quote.currency) : "—"}</span>
          </div>
          {quote?.issues.map((i) => (
            <p key={i} className="mt-3 rounded-xl bg-warning-50 px-3 py-2 text-[13px] text-warning">{i}</p>
          ))}
          {quoteProblems.length > 0 && (
            <p className="mt-3 rounded-xl bg-warning-50 px-3 py-2 text-[13px] text-warning">
              Some items changed. <Link href="/cart" className="font-semibold underline">Review your bag</Link>.
            </p>
          )}
          <Button type="submit" size="lg" className="mt-6 w-full" loading={submitting} loadingText="Placing your order…" disabled={!canSubmit || quoteLoading}>
            <Lock className="h-4 w-4" /> Place order{quote && quote.deliveryFee !== null ? ` · ${formatMoney(quote.total, quote.currency)}` : ""}
          </Button>
          <p className="mt-3 text-center text-[12.5px] text-ink-muted">You will pay {paymentMethod === "cash_on_pickup" ? "at pickup" : "on delivery"}. No payment is taken online.</p>
        </div>
      </aside>
    </form>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]" aria-busy="true">
      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-56 w-full rounded-[1.5rem]" />
        ))}
      </div>
      <Skeleton className="h-96 w-full rounded-[1.5rem]" />
    </div>
  );
}
