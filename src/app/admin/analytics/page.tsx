import { connection } from "next/server";
import { Download, Info } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guards";
import { getAnalytics, resolveAnalyticsRange } from "@/lib/services/analytics";
import { loadSettings } from "@/lib/services/settings";
import { AdminPageHeader, NoAccess, StatCard } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/domain/money";
import { formatDateKey, isDateKey } from "@/lib/domain/time";
import { RangeTabs } from "./range-tabs";
import { AnalyticsView } from "./analytics-view";

export const metadata = { title: "Analytics" };
export const instant = false;

function delta(current: number, previous: number): string | undefined {
  if (previous === 0) return current === 0 ? undefined : "No orders in the previous period";
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}% vs previous period`;
}

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await connection();
  const { allowed } = await requireStaffPage("/admin/analytics", "analytics:read");
  if (!allowed) return <NoAccess what="analytics" />;
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const settings = await loadSettings();
  const from = str("from");
  const to = str("to");
  const range = resolveAnalyticsRange(str("range"), from && isDateKey(from) ? from : undefined, to && isDateKey(to) ? to : undefined, settings.timeZone);
  const data = await getAnalytics(range);
  const t = data.totals;
  const m = (v: number) => formatMoney(v, data.currency);
  const period =
    range.from === range.to
      ? formatDateKey(range.from, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : `${formatDateKey(range.from)} – ${formatDateKey(range.to)}`;
  const qs = new URLSearchParams({ range: range.key, from: range.from, to: range.to }).toString();

  return (
    <>
      <AdminPageHeader
        title="Analytics"
        description={`${period} · ${data.timeZone}`}
        actions={
          <a href={`/api/admin/analytics/export?${qs}`} className={buttonClasses("outline", "sm")}>
            <Download className="h-4 w-4" /> Export CSV
          </a>
        }
      />
      <div className="mb-6">
        <RangeTabs active={range.key} from={range.from} to={range.to} />
      </div>

      {t.ordersPlaced === 0 ? (
        <EmptyState className="mb-6" title="No orders in this period" description="Metrics appear as soon as orders are placed. Try a longer period." />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Orders placed" value={t.ordersPlaced} hint={delta(t.ordersPlaced, data.previous.ordersPlaced)} href={`/admin/orders?range=custom&from=${range.from}&to=${range.to}`} />
            <StatCard label="Gross order value" value={m(t.grossValue)} hint={delta(t.grossValue, data.previous.grossValue) ?? "Excludes cancelled orders"} />
            <StatCard label="Average order value" value={m(t.averageOrderValue)} hint={`${t.activeOrders} active orders`} />
            <StatCard label="Units ordered" value={t.unitsSold} hint="Excludes cancelled orders" />
          </div>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Paid order value" value={m(t.paidValue)} hint="Payment recorded as received" />
            <StatCard label="Fulfilled order value" value={m(t.fulfilledValue)} hint={`${t.fulfilled} delivered / completed`} />
            <StatCard label="Delivery fees" value={m(t.deliveryFees)} hint="Included in order value" />
            <StatCard label="Pending · Cancelled" value={`${t.pending} · ${t.cancelled}`} hint={`${t.confirmedOrLater} confirmed or later`} tone={t.pending > 0 ? "warning" : undefined} />
          </div>
          <AnalyticsView data={data} />
        </>
      )}

      <details className="mt-8 rounded-2xl border border-line bg-paper p-5 text-sm text-ink-soft">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold text-ink">
          <Info className="h-4 w-4 text-brand" /> How these numbers are calculated
        </summary>
        <ul className="mt-4 list-disc space-y-1.5 pl-5">
          <li>Orders are counted on the business day they were placed, in the store time zone ({data.timeZone}).</li>
          <li>“Orders placed” includes every order; all value, unit, product and category metrics exclude cancelled orders.</li>
          <li>“Gross order value” is the sum of order totals including delivery fees. It is not revenue and not profit — profit is not calculated because product costs are not recorded.</li>
          <li>“Paid order value” only counts orders whose cash payment was recorded as received; refunded orders are excluded.</li>
          <li>Metrics are calculated live: an order cancelled later is removed from value metrics automatically.</li>
          <li>The comparison uses the same number of days immediately before the selected period.</li>
        </ul>
      </details>
    </>
  );
}
