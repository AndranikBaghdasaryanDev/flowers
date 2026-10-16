import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Truck, Store, Clock, MapPin, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/store/page-header";
import { RichText } from "@/components/store/rich-text";
import { Skeleton } from "@/components/ui/spinner";
import { listActiveDeliveryMethods } from "@/lib/services/delivery";
import { getSettings } from "@/lib/services/settings";
import { formatMoney } from "@/lib/domain/money";

export const metadata: Metadata = { title: "Delivery & pickup", description: "Delivery areas, fees, time windows and pickup at Floriani Flowers.", alternates: { canonical: "/delivery" } };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function leadTime(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`;
  const h = Math.round((minutes / 60) * 10) / 10;
  return h < 24 ? `${h} hour${h === 1 ? "" : "s"}` : `${Math.round(h / 24)} day${Math.round(h / 24) === 1 ? "" : "s"}`;
}

async function Delivery() {
  await connection();
  const [methods, settings] = await Promise.all([listActiveDeliveryMethods(), getSettings()]);
  const c = settings.currency;
  return (
    <div className="container-page space-y-10 pb-24">
      {settings.content.deliveryInfo && <RichText text={settings.content.deliveryInfo} className="prose-floral max-w-3xl text-[16px]" />}
      {methods.length === 0 ? (
        <p className="text-ink-soft">Delivery options will be published here soon.</p>
      ) : (
        <ul className="grid gap-6 lg:grid-cols-2">
          {methods.map((m) => (
            <li key={m.id} className="rounded-[1.75rem] border border-line bg-paper p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand">
                  {m.type === "pickup" ? <Store className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                </span>
                <h2 className="font-display text-3xl text-ink">{m.name}</h2>
              </div>
              {m.description && <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{m.description}</p>}
              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-ink">Fee</dt>
                  <dd className="mt-0.5 text-ink-soft">
                    {m.fee === 0 ? "Free" : formatMoney(m.fee, c)}
                    {m.freeOverAmount !== null && ` · free from ${formatMoney(m.freeOverAmount, c)}`}
                  </dd>
                </div>
                {m.minOrderAmount > 0 && (
                  <div>
                    <dt className="font-semibold text-ink">Minimum order</dt>
                    <dd className="mt-0.5 text-ink-soft">{formatMoney(m.minOrderAmount, c)}</dd>
                  </div>
                )}
                {m.estimatedTime && (
                  <div>
                    <dt className="font-semibold text-ink">Timing</dt>
                    <dd className="mt-0.5 text-ink-soft">{m.estimatedTime}</dd>
                  </div>
                )}
                <div>
                  <dt className="flex items-center gap-1.5 font-semibold text-ink"><CalendarDays className="h-4 w-4 text-brand" /> Days</dt>
                  <dd className="mt-0.5 text-ink-soft">{m.availableWeekdays.length === 7 ? "Every day" : m.availableWeekdays.map((d) => WEEKDAYS[d]).join(", ")}, up to {m.maxDaysAhead} days ahead</dd>
                </div>
                {m.leadTimeMinutes > 0 && (
                  <div>
                    <dt className="font-semibold text-ink">Order ahead</dt>
                    <dd className="mt-0.5 text-ink-soft">At least {leadTime(m.leadTimeMinutes)} before the chosen time</dd>
                  </div>
                )}
                {m.timeWindows.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="flex items-center gap-1.5 font-semibold text-ink"><Clock className="h-4 w-4 text-brand" /> Time windows</dt>
                    <dd className="mt-2 flex flex-wrap gap-2">
                      {m.timeWindows.map((w) => (
                        <span key={w.label} className="rounded-full bg-cream px-3 py-1 text-[13px] font-medium text-ink-soft tabular">{w.label}</span>
                      ))}
                    </dd>
                  </div>
                )}
                {m.zones.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="flex items-center gap-1.5 font-semibold text-ink"><MapPin className="h-4 w-4 text-brand" /> Areas{m.city ? ` in ${m.city}` : ""}</dt>
                    <dd className="mt-2 flex flex-wrap gap-2">
                      {m.zones.map((z) => (
                        <span key={z.name} className="rounded-full border border-line px-3 py-1 text-[13px] text-ink-soft">
                          {z.name}
                          {z.fee !== null && z.fee !== m.fee ? ` · ${formatMoney(z.fee, c)}` : ""}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {m.type === "pickup" && (
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-ink">Pickup address</dt>
                    <dd className="mt-0.5 text-ink-soft">{m.pickupAddress || settings.contact.address || "Confirmed with your order."}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DeliveryPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Delivery" }]} eyebrow="Delivery & pickup" title="How your flowers reach you" description="Choose a date and time window at checkout, add a gift message, and pay on delivery or at pickup." />
      <Suspense fallback={<div className="container-page grid gap-6 pb-24 lg:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-80 rounded-[1.75rem]" />)}</div>}>
        <Delivery />
      </Suspense>
    </>
  );
}
