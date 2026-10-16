"use client";

import { Link, useFormat, useT } from "@/i18n/client";
import { ColumnChart, BarList } from "@/components/admin/charts";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, type OrderStatus, type PaymentMethod, type PaymentStatus } from "@/lib/domain/orders";
import { paymentMethodLabel, paymentStatusLabel, statusLabel } from "@/i18n/labels";
import type { AnalyticsResult } from "@/lib/services/analytics";

const isIn = (list: readonly string[], v: string) => list.includes(v);

export function AnalyticsView({ data }: { data: AnalyticsResult }) {
  const t = useT();
  const fmt = useFormat();
  const money = (v: number) => fmt.money(v, data.currency);
  const count = (v: number) => fmt.number(Math.round(v));
  const pcs = (v: number) => t("admin.analytics.pcs", { count: Math.round(v) });
  const fmtDay = (d: string, opts?: Intl.DateTimeFormatOptions) => fmt.dateKey(d, opts);
  const dayHref = (d: string) => `/admin/orders?range=custom&from=${d}&to=${d}`;
  const single = data.daily.length === 1;
  const label = (d: string) => fmtDay(d, { day: "numeric", month: "short" });

  return (
    <div className="space-y-6">
      {!single && (
        <div className="grid gap-6 xl:grid-cols-2">
          <ColumnChart
            title={t("admin.analytics.ordersPerDay")}
            integer
            format={count}
            points={data.daily.map((d) => ({ key: d.date, label: label(d.date), sub: fmtDay(d.date, { weekday: "short", day: "numeric", month: "short" }), value: d.orders, href: dayHref(d.date) }))}
          />
          <ColumnChart
            title={t("admin.analytics.valuePerDay")}
            format={money}
            points={data.daily.map((d) => ({ key: d.date, label: label(d.date), sub: fmtDay(d.date, { weekday: "short", day: "numeric", month: "short" }), value: d.value, href: dayHref(d.date) }))}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <BarList
          title={t("admin.analytics.topProducts")}
          format={pcs}
          secondary={money}
          items={data.topProducts.map((p) => ({ key: p.productId, label: p.name, value: p.units, secondary: p.value, href: `/admin/products/${p.productId}` }))}
        />
        <BarList
          title={t("admin.analytics.categoriesByValue")}
          format={money}
          secondary={pcs}
          items={data.categories.map((c) => ({ key: c.categoryId, label: c.name, value: c.value, secondary: c.units }))}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <BarList
          title={t("admin.analytics.orderStatus")}
          format={count}
          items={data.statusBreakdown.map((s) => ({ key: s.status, label: isIn(ORDER_STATUSES, s.status) ? statusLabel(t, s.status as OrderStatus) : s.status, value: s.count }))}
        />
        <BarList
          title={t("admin.analytics.deliveryVsPickup")}
          format={count}
          secondary={money}
          items={data.fulfillment.map((f) => ({ key: f.key, label: f.key === "pickup" ? t("admin.analytics.pickup") : t("admin.analytics.delivery"), value: f.count, secondary: f.value }))}
        />
        <BarList
          title={t("admin.analytics.paymentStatus")}
          format={count}
          secondary={money}
          items={data.paymentStatuses.map((p) => ({ key: p.key, label: isIn(PAYMENT_STATUSES, p.key) ? paymentStatusLabel(t, p.key as PaymentStatus) : p.key, value: p.count, secondary: p.value }))}
        />
      </div>
      <BarList
        title={t("admin.analytics.paymentMethods")}
        format={count}
        secondary={money}
        items={data.paymentMethods.map((p) => ({ key: p.key, label: isIn(PAYMENT_METHODS, p.key) ? paymentMethodLabel(t, p.key as PaymentMethod) : p.key, value: p.count, secondary: p.value }))}
      />

      <section className="rounded-2xl border border-line bg-paper" aria-labelledby="daily-h">
        <h3 id="daily-h" className="border-b border-line px-5 py-4 font-sans text-[15px] font-semibold tracking-normal text-ink">
          {t("admin.analytics.dailyBreakdown")}
        </h3>
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full min-w-[560px] text-left text-[13.5px]">
            <thead>
              <tr className="bg-cream/60 text-[11.5px] uppercase tracking-[0.08em] text-ink-muted">
                <th className="px-5 py-2.5 font-bold">{t("admin.analytics.day")}</th>
                <th className="px-4 py-2.5 text-right font-bold">{t("admin.analytics.placed")}</th>
                <th className="px-4 py-2.5 text-right font-bold">{t("admin.analytics.active")}</th>
                <th className="px-4 py-2.5 text-right font-bold">{t("admin.analytics.cancelled")}</th>
                <th className="px-5 py-2.5 text-right font-bold">{t("admin.analytics.orderValue")}</th>
              </tr>
            </thead>
            <tbody>
              {[...data.daily].reverse().map((d) => (
                <tr key={d.date} className="border-t border-line hover:bg-cream/40">
                  <td className="px-5 py-2.5">
                    {d.orders > 0 ? (
                      <Link href={dayHref(d.date)} className="font-medium text-brand hover:underline">
                        {fmtDay(d.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                      </Link>
                    ) : (
                      <span className="text-ink-muted">{fmtDay(d.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular">{count(d.orders)}</td>
                  <td className="px-4 py-2.5 text-right tabular">{count(d.activeOrders)}</td>
                  <td className="px-4 py-2.5 text-right tabular text-ink-muted">{count(d.cancelled)}</td>
                  <td className="px-5 py-2.5 text-right font-semibold tabular">{money(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
