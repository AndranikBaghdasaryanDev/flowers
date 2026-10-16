import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Truck, Store, Clock, MapPin, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/store/page-header";
import { RichText } from "@/components/store/rich-text";
import { Skeleton } from "@/components/ui/spinner";
import { listActiveDeliveryMethods } from "@/lib/services/delivery";
import { getSettings } from "@/lib/services/settings";
import { getStoreI18n } from "@/i18n/server";
import { localeAlternates } from "@/i18n/metadata";

type StoreI18n = Awaited<ReturnType<typeof getStoreI18n>>;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getStoreI18n();
  return { title: t("delivery.metaTitle"), description: t("delivery.metaDescription"), alternates: localeAlternates("/delivery", locale) };
}

/** Short weekday name; 2023-01-01 was a Sunday, so day 0 maps to Sunday like Date#getDay. */
function weekday(f: StoreI18n["f"], day: number) {
  return f.date(new Date(2023, 0, 1 + day), { weekday: "short" });
}

function leadTime(t: StoreI18n["t"], minutes: number) {
  if (minutes < 60) return t("delivery.minutes", { count: minutes });
  const h = Math.round((minutes / 60) * 10) / 10;
  return h < 24 ? t("delivery.hours", { count: h }) : t("delivery.daysCount", { count: Math.round(h / 24) });
}

async function Delivery() {
  await connection();
  const { locale, t, f } = await getStoreI18n();
  const [methods, settings] = await Promise.all([listActiveDeliveryMethods(locale), getSettings(locale)]);
  const c = settings.currency;
  return (
    <div className="container-page space-y-10 pb-24">
      {settings.content.deliveryInfo && <RichText text={settings.content.deliveryInfo} className="prose-floral max-w-3xl text-[16px]" />}
      {methods.length === 0 ? (
        <p className="text-ink-soft">{t("delivery.noneYet")}</p>
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
                  <dt className="font-semibold text-ink">{t("delivery.fee")}</dt>
                  <dd className="mt-0.5 text-ink-soft">
                    {m.fee === 0 ? t("common.free") : f.money(m.fee, c)}
                    {m.freeOverAmount !== null && ` · ${t("delivery.freeFromLower", { amount: f.money(m.freeOverAmount, c) })}`}
                  </dd>
                </div>
                {m.minOrderAmount > 0 && (
                  <div>
                    <dt className="font-semibold text-ink">{t("delivery.minOrder")}</dt>
                    <dd className="mt-0.5 text-ink-soft">{f.money(m.minOrderAmount, c)}</dd>
                  </div>
                )}
                {m.estimatedTime && (
                  <div>
                    <dt className="font-semibold text-ink">{t("delivery.timing")}</dt>
                    <dd className="mt-0.5 text-ink-soft">{m.estimatedTime}</dd>
                  </div>
                )}
                <div>
                  <dt className="flex items-center gap-1.5 font-semibold text-ink"><CalendarDays className="h-4 w-4 text-brand" /> {t("delivery.days")}</dt>
                  <dd className="mt-0.5 text-ink-soft">
                    {t("delivery.daysAhead", { days: m.availableWeekdays.length === 7 ? t("delivery.everyDay") : m.availableWeekdays.map((d) => weekday(f, d)).join(", "), count: m.maxDaysAhead })}
                  </dd>
                </div>
                {m.leadTimeMinutes > 0 && (
                  <div>
                    <dt className="font-semibold text-ink">{t("delivery.orderAhead")}</dt>
                    <dd className="mt-0.5 text-ink-soft">{t("delivery.leadTime", { time: leadTime(t, m.leadTimeMinutes) })}</dd>
                  </div>
                )}
                {m.timeWindows.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="flex items-center gap-1.5 font-semibold text-ink"><Clock className="h-4 w-4 text-brand" /> {t("delivery.timeWindows")}</dt>
                    <dd className="mt-2 flex flex-wrap gap-2">
                      {m.timeWindows.map((w) => (
                        <span key={w.label} className="rounded-full bg-cream px-3 py-1 text-[13px] font-medium text-ink-soft tabular">{w.label}</span>
                      ))}
                    </dd>
                  </div>
                )}
                {m.zones.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="flex items-center gap-1.5 font-semibold text-ink"><MapPin className="h-4 w-4 text-brand" /> {m.city ? t("delivery.areasIn", { city: m.city }) : t("delivery.areas")}</dt>
                    <dd className="mt-2 flex flex-wrap gap-2">
                      {m.zones.map((z) => (
                        <span key={z.name} className="rounded-full border border-line px-3 py-1 text-[13px] text-ink-soft">
                          {z.name}
                          {z.fee !== null && z.fee !== m.fee ? ` · ${f.money(z.fee, c)}` : ""}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {m.type === "pickup" && (
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-ink">{t("delivery.pickupAddress")}</dt>
                    <dd className="mt-0.5 text-ink-soft">{m.pickupAddress || settings.contact.address || t("delivery.pickupAddressPending")}</dd>
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

export default async function DeliveryPage() {
  const { t } = await getStoreI18n();
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.home"), href: "/" }, { label: t("nav.delivery") }]} eyebrow={t("delivery.metaTitle")} title={t("delivery.title")} description={t("delivery.subtitle")} />
      <Suspense fallback={<div className="container-page grid gap-6 pb-24 lg:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-80 rounded-[1.75rem]" />)}</div>}>
        <Delivery />
      </Suspense>
    </>
  );
}
