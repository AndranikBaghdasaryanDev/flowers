import Link from "next/link";
import { connection } from "next/server";
import { CheckCircle2, Circle, ArrowRight, AlertTriangle } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guards";
import { getDashboardOverview } from "@/lib/services/admin";
import { AdminPageHeader, NoAccess, Panel, StatCard } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/components/store/status-tone";
import { formatMoney } from "@/lib/domain/money";
import { orderStatusLabel, type FulfillmentType, type OrderStatus } from "@/lib/domain/orders";
import { formatDateKey, formatDateTime } from "@/lib/domain/time";

export const metadata = { title: "Overview" };
export const instant = false;

export default async function AdminOverviewPage() {
  await connection();
  const { user, allowed } = await requireStaffPage("/admin", "dashboard:read");
  if (!allowed) return <NoAccess what="the overview" />;
  const d = await getDashboardOverview();
  const open = d.openByStatus;
  const setupLeft = d.setup.filter((s) => !s.done);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={`Good day, ${user.name.split(" ")[0]}`} description={`${formatDateKey(d.today, { weekday: "long", day: "numeric", month: "long" })} · ${d.timeZone}`} />

      {setupLeft.length > 0 && (
        <Panel title="Finish setting up your store" description={`${d.setup.length - setupLeft.length} of ${d.setup.length} done`}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {d.setup.map((s) => (
              <li key={s.key}>
                <Link href={s.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-cream">
                  {s.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : <Circle className="h-5 w-5 shrink-0 text-ink-muted" />}
                  <span className={s.done ? "text-ink-muted line-through" : "text-ink"}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Awaiting confirmation" value={open.pending ?? 0} href="/admin/orders?status=pending" tone={(open.pending ?? 0) > 0 ? "warning" : undefined} hint="New orders to review" />
        <StatCard label="In preparation" value={(open.confirmed ?? 0) + (open.preparing ?? 0)} href="/admin/orders?status=confirmed,preparing" hint="Confirmed & preparing" />
        <StatCard label="Ready / out for delivery" value={(open.ready ?? 0) + (open.out_for_delivery ?? 0)} href="/admin/delivery" hint={`${open.delivery_failed ?? 0} failed attempt(s) open`} />
        <StatCard label="Due today" value={d.dueToday} href={`/admin/orders?range=custom&dateField=delivery&from=${d.today}&to=${d.today}`} hint="Open orders for today" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Latest orders"
          padded={false}
          actions={
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
              All orders <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {d.recent.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">No orders yet. New orders will appear here.</p>
          ) : (
            <ul className="divide-y divide-line">
              {d.recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-cream/60">
                    <span className="font-semibold text-ink">{o.orderNumber}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{o.customerName}</span>
                    <Badge tone={statusTone(o.status as OrderStatus)}>{orderStatusLabel(o.status as OrderStatus, o.fulfillment as FulfillmentType)}</Badge>
                    <span className="w-24 text-right text-sm font-semibold tabular">{formatMoney(o.total, d.currency)}</span>
                    <span className="w-full text-xs text-ink-muted sm:w-auto">{formatDateTime(o.createdAt, d.timeZone, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Orders today" value={d.todayOrders} hint="Excluding cancelled" />
            <StatCard label="Order value today" value={formatMoney(d.todayValue, d.currency)} hint="Not revenue — see Analytics" />
          </div>
          <Panel title="Needs attention">
            <ul className="space-y-3 text-sm">
              {d.pendingReviews > 0 && (
                <li>
                  <Link href="/admin/reviews?status=pending" className="flex items-center justify-between hover:text-brand">
                    Reviews awaiting moderation <Badge tone="brand">{d.pendingReviews}</Badge>
                  </Link>
                </li>
              )}
              {d.lowStock.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/products/${p.id}`} className="flex items-center justify-between gap-3 hover:text-brand">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" /> {p.name}
                    </span>
                    <Badge tone={p.stock === 0 ? "danger" : "warning"}>{p.stock === 0 ? "Out of stock" : `${p.stock} left`}</Badge>
                  </Link>
                </li>
              ))}
              {d.pendingReviews === 0 && d.lowStock.length === 0 && <li className="text-ink-muted">All clear.</li>}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
