import { Link } from "@/i18n/client";
import { connection } from "next/server";
import { CheckCircle2, Circle, ArrowRight, AlertTriangle } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guards";
import { getDashboardOverview } from "@/lib/services/admin";
import { AdminPageHeader, NoAccess, Panel, StatCard } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/components/store/status-tone";
import type { FulfillmentType, OrderStatus } from "@/lib/domain/orders";
import { getAdminI18n } from "@/i18n/server";
import { statusLabel } from "@/i18n/labels";

export async function generateMetadata() {
  const { t } = await getAdminI18n();
  return { title: t("admin.nav.overview") };
}
export const instant = false;

export default async function AdminOverviewPage() {
  await connection();
  const { user, allowed } = await requireStaffPage("/admin", "dashboard:read");
  const { t, f } = await getAdminI18n();
  if (!allowed) return <NoAccess what={t("admin.nav.overview")} />;
  const d = await getDashboardOverview();
  const open = d.openByStatus;
  const setupLeft = d.setup.filter((s) => !s.done);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t("admin.dashboard.greeting", { name: user.name.split(" ")[0] })} description={`${f.dateKey(d.today, { weekday: "long", day: "numeric", month: "long" })} · ${d.timeZone}`} />

      {setupLeft.length > 0 && (
        <Panel title={t("admin.dashboard.setupTitle")} description={t("admin.dashboard.setupProgress", { done: d.setup.length - setupLeft.length, total: d.setup.length })}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {d.setup.map((s) => (
              <li key={s.key}>
                <Link href={s.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-cream">
                  {s.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : <Circle className="h-5 w-5 shrink-0 text-ink-muted" />}
                  <span className={s.done ? "text-ink-muted line-through" : "text-ink"}>{t.dynamic(`admin.dashboard.setup.${s.key}`, undefined, s.label)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("admin.dashboard.awaiting")} value={open.pending ?? 0} href="/admin/orders?status=pending" tone={(open.pending ?? 0) > 0 ? "warning" : undefined} hint={t("admin.dashboard.awaitingHint")} />
        <StatCard label={t("admin.dashboard.inPreparation")} value={(open.confirmed ?? 0) + (open.preparing ?? 0)} href="/admin/orders?status=confirmed,preparing" hint={t("admin.dashboard.inPreparationHint")} />
        <StatCard label={t("admin.dashboard.readyOut")} value={(open.ready ?? 0) + (open.out_for_delivery ?? 0)} href="/admin/delivery" hint={t("admin.dashboard.failedOpen", { count: open.delivery_failed ?? 0 })} />
        <StatCard label={t("admin.dashboard.dueToday")} value={d.dueToday} href={`/admin/orders?range=custom&dateField=delivery&from=${d.today}&to=${d.today}`} hint={t("admin.dashboard.dueTodayHint")} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title={t("admin.dashboard.latest")}
          padded={false}
          actions={
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
              {t("admin.dashboard.allOrders")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {d.recent.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">{t("admin.dashboard.noOrders")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {d.recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-cream/60">
                    <span className="font-semibold text-ink">{o.orderNumber}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{o.customerName}</span>
                    <Badge tone={statusTone(o.status as OrderStatus)}>{statusLabel(t, o.status as OrderStatus, o.fulfillment as FulfillmentType)}</Badge>
                    <span className="w-24 text-right text-sm font-semibold tabular">{f.money(o.total, d.currency)}</span>
                    <span className="w-full text-xs text-ink-muted sm:w-auto">{f.dateTime(o.createdAt, d.timeZone, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label={t("admin.dashboard.ordersToday")} value={d.todayOrders} hint={t("admin.dashboard.excludingCancelled")} />
            <StatCard label={t("admin.dashboard.valueToday")} value={f.money(d.todayValue, d.currency)} hint={t("admin.dashboard.notRevenue")} />
          </div>
          <Panel title={t("admin.dashboard.attention")}>
            <ul className="space-y-3 text-sm">
              {d.pendingReviews > 0 && (
                <li>
                  <Link href="/admin/reviews?status=pending" className="flex items-center justify-between hover:text-brand">
                    {t("admin.dashboard.reviewsAwaiting")} <Badge tone="brand">{d.pendingReviews}</Badge>
                  </Link>
                </li>
              )}
              {d.lowStock.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/products/${p.id}`} className="flex items-center justify-between gap-3 hover:text-brand">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" /> {p.name}
                    </span>
                    <Badge tone={p.stock === 0 ? "danger" : "warning"}>{p.stock === 0 ? t("admin.dashboard.outOfStock") : t("admin.dashboard.stockLeft", { count: p.stock })}</Badge>
                  </Link>
                </li>
              ))}
              {d.pendingReviews === 0 && d.lowStock.length === 0 && <li className="text-ink-muted">{t("admin.dashboard.allClear")}</li>}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
