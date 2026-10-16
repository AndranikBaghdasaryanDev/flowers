import { connection } from "next/server";
import { Download, Info } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guards";
import { getAnalytics, resolveAnalyticsRange } from "@/lib/services/analytics";
import { loadSettings } from "@/lib/services/settings";
import { AdminPageHeader, NoAccess, StatCard } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { isDateKey } from "@/lib/domain/time";
import { getAdminI18n } from "@/i18n/server";
import { RangeTabs } from "./range-tabs";
import { AnalyticsView } from "./analytics-view";

export async function generateMetadata() {
  const { t } = await getAdminI18n();
  return { title: t("admin.nav.analytics") };
}
export const instant = false;

type T = Awaited<ReturnType<typeof getAdminI18n>>["t"];

function delta(t: T, current: number, previous: number): string | undefined {
  if (previous === 0) return current === 0 ? undefined : t("admin.analytics.noPrevious");
  const pct = Math.round(((current - previous) / previous) * 100);
  return t("admin.analytics.vsPrevious", { pct: `${pct >= 0 ? "+" : ""}${pct}` });
}

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await connection();
  const { allowed } = await requireStaffPage("/admin/analytics", "analytics:read");
  const { t, f } = await getAdminI18n();
  if (!allowed) return <NoAccess what={t("admin.nav.analytics")} />;
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const settings = await loadSettings();
  const from = str("from");
  const to = str("to");
  const range = resolveAnalyticsRange(str("range"), from && isDateKey(from) ? from : undefined, to && isDateKey(to) ? to : undefined, settings.timeZone);
  const data = await getAnalytics(range);
  const tot = data.totals;
  const m = (v: number) => f.money(v, data.currency);
  const period =
    range.from === range.to
      ? f.dateKey(range.from, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : `${f.dateKey(range.from)} – ${f.dateKey(range.to)}`;
  const qs = new URLSearchParams({ range: range.key, from: range.from, to: range.to }).toString();

  return (
    <>
      <AdminPageHeader
        title={t("admin.nav.analytics")}
        description={`${period} · ${data.timeZone}`}
        actions={
          <a href={`/api/admin/analytics/export?${qs}`} className={buttonClasses("outline", "sm")}>
            <Download className="h-4 w-4" /> {t("admin.analytics.exportCsv")}
          </a>
        }
      />
      <div className="mb-6">
        <RangeTabs active={range.key} from={range.from} to={range.to} />
      </div>

      {tot.ordersPlaced === 0 ? (
        <EmptyState className="mb-6" title={t("admin.analytics.emptyTitle")} description={t("admin.analytics.emptyText")} />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t("admin.analytics.ordersPlaced")} value={f.number(tot.ordersPlaced)} hint={delta(t, tot.ordersPlaced, data.previous.ordersPlaced)} href={`/admin/orders?range=custom&from=${range.from}&to=${range.to}`} />
            <StatCard label={t("admin.analytics.grossValue")} value={m(tot.grossValue)} hint={delta(t, tot.grossValue, data.previous.grossValue) ?? t("admin.analytics.excludesCancelled")} />
            <StatCard label={t("admin.analytics.averageValue")} value={m(tot.averageOrderValue)} hint={t("admin.analytics.activeOrders", { count: tot.activeOrders })} />
            <StatCard label={t("admin.analytics.unitsOrdered")} value={f.number(tot.unitsSold)} hint={t("admin.analytics.excludesCancelled")} />
          </div>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t("admin.analytics.paidValue")} value={m(tot.paidValue)} hint={t("admin.analytics.paidHint")} />
            <StatCard label={t("admin.analytics.fulfilledValue")} value={m(tot.fulfilledValue)} hint={t("admin.analytics.fulfilledHint", { count: tot.fulfilled })} />
            <StatCard label={t("admin.analytics.deliveryFees")} value={m(tot.deliveryFees)} hint={t("admin.analytics.deliveryFeesHint")} />
            <StatCard label={t("admin.analytics.pendingCancelled")} value={`${f.number(tot.pending)} · ${f.number(tot.cancelled)}`} hint={t("admin.analytics.confirmedOrLater", { count: tot.confirmedOrLater })} tone={tot.pending > 0 ? "warning" : undefined} />
          </div>
          <AnalyticsView data={data} />
        </>
      )}

      <details className="mt-8 rounded-2xl border border-line bg-paper p-5 text-sm text-ink-soft">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold text-ink">
          <Info className="h-4 w-4 text-brand" /> {t("admin.analytics.howTitle")}
        </summary>
        <ul className="mt-4 list-disc space-y-1.5 pl-5">
          <li>{t("admin.analytics.how1", { timeZone: data.timeZone })}</li>
          <li>{t("admin.analytics.how2")}</li>
          <li>{t("admin.analytics.how3")}</li>
          <li>{t("admin.analytics.how4")}</li>
          <li>{t("admin.analytics.how5")}</li>
          <li>{t("admin.analytics.how6")}</li>
        </ul>
      </details>
    </>
  );
}
