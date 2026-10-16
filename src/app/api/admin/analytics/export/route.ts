import { readQuery, requirePermission, route } from "@/lib/api/handler";
import { analyticsQuerySchema } from "@/lib/validation";
import { getAnalytics, resolveAnalyticsRange } from "@/lib/services/analytics";
import { loadSettings } from "@/lib/services/settings";
import { csvResponse, toCsv } from "@/lib/csv";
import { toMajor } from "@/lib/domain/money";
import { getAdminLocale, translatorFor } from "@/i18n/server";

/** Daily figures and product breakdown for the selected range, as CSV. */
export const GET = route(async (req) => {
  await requirePermission("analytics:read");
  const q = readQuery(req, analyticsQuerySchema);
  const settings = await loadSettings();
  const range = resolveAnalyticsRange(q.range, q.from, q.to, settings.timeZone);
  const a = await getAnalytics(range);
  const t = translatorFor(await getAdminLocale());
  const m = (v: number) => toMajor(v, a.currency);
  const rows: unknown[][] = a.daily.map((d) => [t("admin.analytics.csv.day"), d.date, d.orders, d.activeOrders, d.cancelled, m(d.value), "", ""]);
  for (const p of a.topProducts) rows.push([t("admin.analytics.csv.product"), "", "", "", "", m(p.value), p.name, p.units]);
  for (const c of a.categories) rows.push([t("admin.analytics.csv.category"), "", "", "", "", m(c.value), c.name, c.units]);
  const csv = toCsv(
    [
      t("admin.analytics.csv.rowType"),
      t("admin.analytics.csv.date"),
      t("admin.analytics.ordersPlaced"),
      t("admin.analytics.csv.activeOrders"),
      t("admin.analytics.cancelled"),
      t("admin.analytics.csv.orderValue", { currency: a.currency }),
      t("admin.analytics.csv.name"),
      t("admin.analytics.csv.units"),
    ],
    rows,
  );
  return csvResponse(`floriani-analytics-${a.range.from}-to-${a.range.to}.csv`, csv);
});
