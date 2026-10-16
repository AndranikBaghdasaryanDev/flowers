"use client";

import Link from "next/link";
import { ColumnChart, BarList } from "@/components/admin/charts";
import { formatMoney } from "@/lib/domain/money";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, type OrderStatus, type PaymentMethod, type PaymentStatus } from "@/lib/domain/orders";
import { formatDateKey } from "@/lib/domain/time";
import type { AnalyticsResult } from "@/lib/services/analytics";

export function AnalyticsView({ data }: { data: AnalyticsResult }) {
  const money = (v: number) => formatMoney(v, data.currency);
  const count = (v: number) => new Intl.NumberFormat("en-US").format(Math.round(v));
  const dayHref = (d: string) => `/admin/orders?range=custom&from=${d}&to=${d}`;
  const single = data.daily.length === 1;
  const label = (d: string) => formatDateKey(d, { day: "numeric", month: "short" });

  return (
    <div className="space-y-6">
      {!single && (
        <div className="grid gap-6 xl:grid-cols-2">
          <ColumnChart
            title="Orders placed per day"
            integer
            format={count}
            points={data.daily.map((d) => ({ key: d.date, label: label(d.date), sub: formatDateKey(d.date, { weekday: "short", day: "numeric", month: "short" }), value: d.orders, href: dayHref(d.date) }))}
          />
          <ColumnChart
            title="Order value per day (excl. cancelled)"
            format={money}
            points={data.daily.map((d) => ({ key: d.date, label: label(d.date), sub: formatDateKey(d.date, { weekday: "short", day: "numeric", month: "short" }), value: d.value, href: dayHref(d.date) }))}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <BarList
          title="Most ordered products"
          format={(v) => `${count(v)} pcs`}
          secondary={money}
          items={data.topProducts.map((p) => ({ key: p.productId, label: p.name, value: p.units, secondary: p.value, href: `/admin/products/${p.productId}` }))}
        />
        <BarList
          title="Categories by order value"
          format={money}
          secondary={(v) => `${count(v)} pcs`}
          items={data.categories.map((c) => ({ key: c.categoryId, label: c.name, value: c.value, secondary: c.units }))}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <BarList
          title="Order status"
          format={count}
          items={data.statusBreakdown.map((s) => ({ key: s.status, label: ORDER_STATUS_LABELS[s.status as OrderStatus] ?? s.status, value: s.count }))}
        />
        <BarList
          title="Delivery vs pickup"
          format={count}
          secondary={money}
          items={data.fulfillment.map((f) => ({ key: f.key, label: f.key === "pickup" ? "Pickup" : "Delivery", value: f.count, secondary: f.value }))}
        />
        <BarList
          title="Payment status"
          format={count}
          secondary={money}
          items={data.paymentStatuses.map((p) => ({ key: p.key, label: PAYMENT_STATUS_LABELS[p.key as PaymentStatus] ?? p.key, value: p.count, secondary: p.value }))}
        />
      </div>
      <BarList
        title="Payment methods (excl. cancelled)"
        format={count}
        secondary={money}
        items={data.paymentMethods.map((p) => ({ key: p.key, label: PAYMENT_METHOD_LABELS[p.key as PaymentMethod] ?? p.key, value: p.count, secondary: p.value }))}
      />

      <section className="rounded-2xl border border-line bg-paper" aria-labelledby="daily-h">
        <h3 id="daily-h" className="border-b border-line px-5 py-4 font-sans text-[15px] font-semibold tracking-normal text-ink">
          Daily breakdown
        </h3>
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full min-w-[560px] text-left text-[13.5px]">
            <thead>
              <tr className="bg-cream/60 text-[11.5px] uppercase tracking-[0.08em] text-ink-muted">
                <th className="px-5 py-2.5 font-bold">Day</th>
                <th className="px-4 py-2.5 text-right font-bold">Placed</th>
                <th className="px-4 py-2.5 text-right font-bold">Active</th>
                <th className="px-4 py-2.5 text-right font-bold">Cancelled</th>
                <th className="px-5 py-2.5 text-right font-bold">Order value</th>
              </tr>
            </thead>
            <tbody>
              {[...data.daily].reverse().map((d) => (
                <tr key={d.date} className="border-t border-line hover:bg-cream/40">
                  <td className="px-5 py-2.5">
                    {d.orders > 0 ? (
                      <Link href={dayHref(d.date)} className="font-medium text-brand hover:underline">
                        {formatDateKey(d.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                      </Link>
                    ) : (
                      <span className="text-ink-muted">{formatDateKey(d.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular">{d.orders}</td>
                  <td className="px-4 py-2.5 text-right tabular">{d.activeOrders}</td>
                  <td className="px-4 py-2.5 text-right tabular text-ink-muted">{d.cancelled}</td>
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
