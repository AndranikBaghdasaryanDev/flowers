import "server-only";
import { connectDb } from "@/lib/db";
import { Order } from "@/lib/models/order";
import { addDaysToKey, eachDayKey, toDateKey, zonedDayRange } from "@/lib/domain/time";
import type { CurrencyCode } from "@/lib/domain/money";
import { loadSettings } from "@/lib/services/settings";

/**
 * Metric definitions (also shown in the admin UI):
 * - Orders are attributed to the business day on which they were PLACED (store time zone).
 * - "Orders placed" counts every order, including cancelled ones.
 * - "Gross order value" = sum of totals of non-cancelled orders (includes delivery fees). It is not revenue or profit.
 * - "Paid order value" = sum of totals of orders whose payment is recorded as paid (refunded orders excluded).
 * - "Fulfilled order value" = sum of totals of orders now delivered or completed.
 * - Cancelled orders are excluded from value, units, product and category metrics; because metrics are
 *   computed live, an order cancelled later disappears from those metrics automatically.
 * - Profit is not calculated: no product cost data is stored.
 */

export type AnalyticsRange = { from: string; to: string };

export type AnalyticsResult = {
  range: AnalyticsRange;
  currency: CurrencyCode;
  timeZone: string;
  totals: {
    ordersPlaced: number;
    activeOrders: number;
    cancelled: number;
    pending: number;
    confirmedOrLater: number;
    fulfilled: number;
    grossValue: number;
    paidValue: number;
    fulfilledValue: number;
    averageOrderValue: number;
    deliveryFees: number;
    unitsSold: number;
  };
  previous: { ordersPlaced: number; grossValue: number };
  daily: { date: string; orders: number; activeOrders: number; value: number; cancelled: number }[];
  topProducts: { productId: string; name: string; units: number; value: number }[];
  categories: { categoryId: string; name: string; units: number; value: number }[];
  statusBreakdown: { status: string; count: number }[];
  paymentMethods: { key: string; count: number; value: number }[];
  paymentStatuses: { key: string; count: number; value: number }[];
  fulfillment: { key: string; count: number; value: number }[];
};

export function resolveAnalyticsRange(
  range: string | undefined,
  from: string | undefined,
  to: string | undefined,
  timeZone: string,
): AnalyticsRange & { key: string } {
  const today = toDateKey(new Date(), timeZone);
  switch (range) {
    case "today":
      return { key: "today", from: today, to: today };
    case "yesterday": {
      const y = addDaysToKey(today, -1);
      return { key: "yesterday", from: y, to: y };
    }
    case "30d":
      return { key: "30d", from: addDaysToKey(today, -29), to: today };
    case "this_month":
      return { key: "this_month", from: `${today.slice(0, 8)}01`, to: today };
    case "last_month": {
      const firstThis = `${today.slice(0, 8)}01`;
      const lastPrev = addDaysToKey(firstThis, -1);
      return { key: "last_month", from: `${lastPrev.slice(0, 8)}01`, to: lastPrev };
    }
    case "custom":
      if (from && to) {
        const [a, b] = from <= to ? [from, to] : [to, from];
        // Cap custom ranges at ~2 years to keep queries bounded.
        return { key: "custom", from: a < addDaysToKey(b, -731) ? addDaysToKey(b, -731) : a, to: b };
      }
      return { key: "7d", from: addDaysToKey(today, -6), to: today };
    case "7d":
    default:
      return { key: "7d", from: addDaysToKey(today, -6), to: today };
  }
}

const NOT_CANCELLED = { $ne: ["$status", "cancelled"] };
const sumIf = (cond: unknown, value: unknown = 1) => ({ $sum: { $cond: [cond, value, 0] } });

export async function getAnalytics(range: AnalyticsRange): Promise<AnalyticsResult> {
  await connectDb();
  const settings = await loadSettings();
  const tz = settings.timeZone;
  const { start, end } = zonedDayRange(range.from, range.to, tz);
  const days = eachDayKey(range.from, range.to);
  const prevTo = addDaysToKey(range.from, -1);
  const prevFrom = addDaysToKey(prevTo, -(days.length - 1));
  const prev = zonedDayRange(prevFrom, prevTo, tz);

  const [facet] = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              ordersPlaced: { $sum: 1 },
              activeOrders: sumIf(NOT_CANCELLED),
              cancelled: sumIf({ $eq: ["$status", "cancelled"] }),
              pending: sumIf({ $eq: ["$status", "pending"] }),
              confirmedOrLater: sumIf({ $not: [{ $in: ["$status", ["pending", "cancelled"]] }] }),
              fulfilled: sumIf({ $in: ["$status", ["delivered", "completed"]] }),
              grossValue: sumIf(NOT_CANCELLED, "$total"),
              paidValue: sumIf({ $eq: ["$paymentStatus", "paid"] }, "$total"),
              fulfilledValue: sumIf({ $in: ["$status", ["delivered", "completed"]] }, "$total"),
              deliveryFees: sumIf(NOT_CANCELLED, "$deliveryFee"),
            },
          },
        ],
        daily: [
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: tz } },
              orders: { $sum: 1 },
              activeOrders: sumIf(NOT_CANCELLED),
              cancelled: sumIf({ $eq: ["$status", "cancelled"] }),
              value: sumIf(NOT_CANCELLED, "$total"),
            },
          },
        ],
        items: [
          { $match: { status: { $ne: "cancelled" } } },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.product",
              name: { $last: "$items.name" },
              units: { $sum: "$items.quantity" },
              value: { $sum: "$items.lineTotal" },
            },
          },
          { $sort: { units: -1, value: -1 } },
        ],
        statusBreakdown: [{ $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        paymentMethods: [
          { $match: { status: { $ne: "cancelled" } } },
          { $group: { _id: "$paymentMethod", count: { $sum: 1 }, value: { $sum: "$total" } } },
        ],
        paymentStatuses: [{ $group: { _id: "$paymentStatus", count: { $sum: 1 }, value: { $sum: "$total" } } }],
        fulfillment: [
          { $match: { status: { $ne: "cancelled" } } },
          { $group: { _id: "$fulfillment.kind", count: { $sum: 1 }, value: { $sum: "$total" } } },
        ],
      },
    },
  ]);

  const [prevRow] = await Order.aggregate([
    { $match: { createdAt: { $gte: prev.start, $lt: prev.end } } },
    { $group: { _id: null, ordersPlaced: { $sum: 1 }, grossValue: sumIf(NOT_CANCELLED, "$total") } },
  ]);

  const items: { _id: unknown; name: string; units: number; value: number }[] = facet?.items ?? [];
  const categoryRows = items.length
    ? await Order.db
        .collection("products")
        .aggregate<{ _id: unknown; category: unknown }>([
          { $match: { _id: { $in: items.map((i) => i._id) } } },
          { $project: { category: 1 } },
        ])
        .toArray()
    : [];
  const productCategory = new Map(categoryRows.map((r) => [String(r._id), String(r.category)]));
  const categoryNames = new Map(
    (
      await Order.db
        .collection("categories")
        .find({ _id: { $in: categoryRows.map((r) => r.category) } } as Record<string, unknown>)
        .project<{ _id: unknown; name: string }>({ name: 1 })
        .toArray()
    ).map((c) => [String(c._id), c.name]),
  );
  const catAgg = new Map<string, { categoryId: string; name: string; units: number; value: number }>();
  for (const it of items) {
    const catId = productCategory.get(String(it._id)) ?? "unknown";
    const row = catAgg.get(catId) ?? { categoryId: catId, name: categoryNames.get(catId) ?? "Uncategorised", units: 0, value: 0 };
    row.units += it.units;
    row.value += it.value;
    catAgg.set(catId, row);
  }

  const t = facet?.totals?.[0] ?? {};
  const dailyMap = new Map<string, { orders: number; activeOrders: number; value: number; cancelled: number }>(
    (facet?.daily ?? []).map((d: { _id: string; orders: number; activeOrders: number; value: number; cancelled: number }) => [
      d._id,
      { orders: d.orders, activeOrders: d.activeOrders, value: d.value, cancelled: d.cancelled },
    ]),
  );
  const active = t.activeOrders ?? 0;
  const gross = t.grossValue ?? 0;
  const mapKV = (rows: { _id: string; count: number; value: number }[] = []) =>
    rows.map((r) => ({ key: r._id, count: r.count, value: r.value })).sort((a, b) => b.count - a.count);

  return {
    range: { from: range.from, to: range.to },
    currency: settings.currency,
    timeZone: tz,
    totals: {
      ordersPlaced: t.ordersPlaced ?? 0,
      activeOrders: active,
      cancelled: t.cancelled ?? 0,
      pending: t.pending ?? 0,
      confirmedOrLater: t.confirmedOrLater ?? 0,
      fulfilled: t.fulfilled ?? 0,
      grossValue: gross,
      paidValue: t.paidValue ?? 0,
      fulfilledValue: t.fulfilledValue ?? 0,
      averageOrderValue: active > 0 ? Math.round(gross / active) : 0,
      deliveryFees: t.deliveryFees ?? 0,
      unitsSold: items.reduce((n, i) => n + i.units, 0),
    },
    previous: { ordersPlaced: prevRow?.ordersPlaced ?? 0, grossValue: prevRow?.grossValue ?? 0 },
    daily: days.map((date) => ({ date, ...(dailyMap.get(date) ?? { orders: 0, activeOrders: 0, value: 0, cancelled: 0 }) })),
    topProducts: items.slice(0, 10).map((i) => ({ productId: String(i._id), name: i.name, units: i.units, value: i.value })),
    categories: [...catAgg.values()].sort((a, b) => b.value - a.value),
    statusBreakdown: (facet?.statusBreakdown ?? []).map((s: { _id: string; count: number }) => ({ status: s._id, count: s.count })),
    paymentMethods: mapKV(facet?.paymentMethods),
    paymentStatuses: mapKV(facet?.paymentStatuses),
    fulfillment: mapKV(facet?.fulfillment),
  };
}
