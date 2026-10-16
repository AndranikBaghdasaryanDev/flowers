import Link from "next/link";
import { connection } from "next/server";
import { AlertTriangle, CalendarDays, Car, ChevronLeft, ChevronRight, Clock, MapPin, Settings2, Store, Truck, Users } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guards";
import { listOrdersAdmin, type OrderListQuery } from "@/lib/services/orders";
import { listCouriers } from "@/lib/services/admin";
import { loadSettings } from "@/lib/services/settings";
import { AdminPageHeader, NoAccess, Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { LinkButton, buttonClasses } from "@/components/ui/button";
import { statusTone } from "@/components/store/status-tone";
import { formatMoney } from "@/lib/domain/money";
import { orderStatusLabel, VEHICLE_LABELS, type OrderStatus } from "@/lib/domain/orders";
import { hasPermission } from "@/lib/domain/roles";
import { addDaysToKey, formatDateKey, isDateKey, toDateKey } from "@/lib/domain/time";
import { cn } from "@/lib/cn";
import type { OrderListItemDTO } from "@/lib/types";

export const metadata = { title: "Delivery" };
export const instant = false;

/** listOrdersAdmin pages by 20; the board loads every page for the day (bounded). */
const MAX_PAGES = 10;

async function loadDay(date: string, fulfillment: "delivery" | "pickup") {
  const query: OrderListQuery = { range: "custom", from: date, to: date, dateField: "delivery", fulfillment, sort: "delivery_date" };
  const first = await listOrdersAdmin({ ...query, page: 1 });
  const last = Math.min(first.pageCount, MAX_PAGES);
  const rest = last > 1 ? await Promise.all(Array.from({ length: last - 1 }, (_, i) => listOrdersAdmin({ ...query, page: i + 2 }))) : [];
  return { items: [first, ...rest].flatMap((r) => r.items), total: first.total, truncated: first.pageCount > MAX_PAGES };
}

const SECTIONS: { key: string; title: string; hint: string; statuses: readonly OrderStatus[]; tone?: "warning" | "success" }[] = [
  { key: "prepare", title: "To prepare", hint: "Pending, confirmed or in the workshop", statuses: ["pending", "confirmed", "preparing"] },
  { key: "ready", title: "Ready for dispatch", hint: "Bouquets waiting for a courier", statuses: ["ready"] },
  { key: "out", title: "Out for delivery", hint: "On the way to the recipient", statuses: ["out_for_delivery"] },
  { key: "failed", title: "Needs attention", hint: "Delivery failed — retry or return to shop", statuses: ["delivery_failed"], tone: "warning" },
  { key: "done", title: "Delivered", hint: "Delivered or completed", statuses: ["delivered", "completed"], tone: "success" },
];

const dayHref = (date: string, today: string) => (date === today ? "/admin/delivery" : `/admin/delivery?date=${date}`);

export default async function AdminDeliveryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { user, allowed } = await requireStaffPage("/admin/delivery", "delivery:manage");
  if (!allowed) return <NoAccess what="delivery" />;
  const raw = await searchParams;
  const settings = await loadSettings();
  const today = toDateKey(new Date(), settings.timeZone);
  const date = typeof raw.date === "string" && isDateKey(raw.date) ? raw.date : today;

  const [deliveries, pickups, couriers] = await Promise.all([loadDay(date, "delivery"), loadDay(date, "pickup"), listCouriers(false)]);
  const canSettings = hasPermission(user.role, "settings:manage");

  const cancelled = deliveries.items.filter((o) => o.status === "cancelled").length;
  const live = deliveries.items.filter((o) => o.status !== "cancelled");
  const unassigned = live.filter((o) => o.requiresCourier && !o.courierName && !["delivered", "completed"].includes(o.status)).length;
  const pickupsLive = pickups.items.filter((o) => o.status !== "cancelled");
  const pickupsCancelled = pickups.items.length - pickupsLive.length;

  const dayLabel = date === today ? "Today" : date === addDaysToKey(today, 1) ? "Tomorrow" : date === addDaysToKey(today, -1) ? "Yesterday" : null;

  return (
    <>
      <AdminPageHeader
        title="Delivery"
        description={
          <>
            {dayLabel ? `${dayLabel}, ` : ""}
            {formatDateKey(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · <span className="tabular">{live.length}</span> {live.length === 1 ? "delivery" : "deliveries"},{" "}
            <span className="tabular">{pickupsLive.length}</span> {pickupsLive.length === 1 ? "pickup" : "pickups"}
          </>
        }
        actions={
          <>
            <LinkButton href="/admin/delivery/couriers" variant="outline" size="sm" icon={<Users className="h-4 w-4" />}>
              Couriers
            </LinkButton>
            {canSettings && (
              <LinkButton href="/admin/delivery/settings" variant="outline" size="sm" icon={<Settings2 className="h-4 w-4" />}>
                Delivery settings
              </LinkButton>
            )}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <nav aria-label="Choose day" className="flex items-center gap-1 rounded-full border border-line bg-paper p-1">
          <Link href={dayHref(addDaysToKey(date, -1), today)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-cream hover:text-brand" aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="flex items-center gap-1.5 px-2 text-[13px] font-semibold text-ink tabular">
            <CalendarDays className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
            {formatDateKey(date, { weekday: "short", day: "numeric", month: "short" })}
          </span>
          <Link href={dayHref(addDaysToKey(date, 1), today)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-cream hover:text-brand" aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </nav>
        <Link
          href="/admin/delivery"
          aria-current={date === today ? "true" : undefined}
          className={cn(
            "inline-flex h-10 items-center rounded-full border px-4 text-[13px] font-semibold transition-colors",
            date === today ? "border-brand bg-brand text-white" : "border-line bg-paper text-ink-soft hover:border-brand hover:text-brand",
          )}
        >
          Today
        </Link>
        <form method="get" action="/admin/delivery" className="flex items-center gap-2">
          <label htmlFor="delivery-date" className="sr-only">
            Go to date
          </label>
          <input id="delivery-date" type="date" name="date" defaultValue={date} className="h-10 rounded-full border border-line bg-paper px-3 text-[13px]" />
          <button type="submit" className={buttonClasses("secondary", "sm", "h-10")}>
            Go
          </button>
        </form>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Deliveries" value={live.length} />
        <Stat label="Without courier" value={unassigned} warn={unassigned > 0} />
        <Stat label="Needs attention" value={live.filter((o) => o.status === "delivery_failed").length} warn={live.some((o) => o.status === "delivery_failed")} />
        <Stat label="Cancelled" value={cancelled} hint="Not shown on the board" />
      </div>

      {deliveries.truncated && (
        <p role="status" className="mb-4 rounded-xl bg-warning-50 px-4 py-2.5 text-[13px] text-warning">
          Showing the first {deliveries.items.length} of {deliveries.total} orders for this day. Use the{" "}
          <Link href={`/admin/orders?range=custom&from=${date}&to=${date}&dateField=delivery&fulfillment=delivery&sort=delivery_date`} className="font-semibold underline">
            orders list
          </Link>{" "}
          to see all of them.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 content-start gap-4 md:grid-cols-2">
          {SECTIONS.map((s) => {
            const items = live.filter((o) => s.statuses.includes(o.status));
            return <BoardSection key={s.key} title={s.title} hint={s.hint} items={items} tone={s.tone} />;
          })}
        </div>

        <aside className="min-w-0 space-y-6">
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Store className="h-4 w-4" /> Pickups
              </span>
            }
            description={pickupsCancelled > 0 ? `${pickupsCancelled} cancelled not shown` : "Collected at the shop"}
            padded={false}
          >
            {pickupsLive.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-muted">No pickups on this day.</p>
            ) : (
              <ul className="divide-y divide-line">
                {pickupsLive.map((o) => (
                  <li key={o.id} className="relative px-5 py-3 hover:bg-cream/50">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold text-ink after:absolute after:inset-0 hover:text-brand">
                        {o.orderNumber}
                      </Link>
                      <Badge tone={statusTone(o.status)}>{orderStatusLabel(o.status, "pickup")}</Badge>
                    </div>
                    <p className="mt-0.5 flex items-center justify-between gap-2 text-[13px] text-ink-muted">
                      <span className="truncate">
                        {o.timeWindowLabel || "Any time"} · {o.customerName}
                      </span>
                      <span className="shrink-0 font-semibold text-ink tabular">{formatMoney(o.total, o.currency)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title={
              <span className="flex items-center gap-2">
                <Car className="h-4 w-4" /> Couriers
              </span>
            }
            description="Open deliveries per courier (any day)"
            actions={
              <Link href="/admin/delivery/couriers" className="text-[13px] font-semibold text-brand hover:underline">
                Manage
              </Link>
            }
            padded={false}
          >
            {couriers.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-ink-muted">
                <p>No active couriers yet.</p>
                <Link href="/admin/delivery/couriers" className="mt-1 inline-block font-semibold text-brand hover:underline">
                  Add a courier
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {couriers.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{c.name}</p>
                      <p className="truncate text-xs text-ink-muted">{[VEHICLE_LABELS[c.vehicleType], c.phone].filter(Boolean).join(" · ")}</p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-2 text-[13px] font-semibold tabular",
                        c.activeDeliveries > 0 ? "bg-brand-50 text-brand" : "bg-cream text-ink-muted",
                      )}
                      aria-label={`${c.activeDeliveries} active ${c.activeDeliveries === 1 ? "delivery" : "deliveries"}`}
                    >
                      {c.activeDeliveries}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {canSettings && (
            <Link href="/admin/delivery/settings" className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-5 py-4 text-sm transition-colors hover:border-brand/40">
              <span>
                <span className="block font-semibold text-ink">Delivery settings</span>
                <span className="block text-[13px] text-ink-muted">Methods, fees, areas and time windows</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}

function Stat({ label, value, hint, warn }: { label: string; value: number; hint?: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-paper px-4 py-3.5">
      <p className="text-[12.5px] font-semibold text-ink-muted">{label}</p>
      <p className={cn("mt-1 text-[1.5rem] font-semibold leading-none tabular", warn ? "text-warning" : "text-ink")}>{value}</p>
      {hint && <p className="mt-1 text-[12px] text-ink-muted">{hint}</p>}
    </div>
  );
}

function BoardSection({ title, hint, items, tone }: { title: string; hint: string; items: OrderListItemDTO[]; tone?: "warning" | "success" }) {
  const alert = tone === "warning" && items.length > 0;
  return (
    <section aria-label={title} className={cn("flex min-w-0 flex-col rounded-2xl border bg-paper", alert ? "border-warning/40" : "border-line")}>
      <header className={cn("flex items-start justify-between gap-3 border-b px-4 py-3", alert ? "border-warning/30 bg-warning-50/60" : "border-line")}>
        <div className="min-w-0">
          <h2 className={cn("flex items-center gap-1.5 font-sans text-[15px] font-semibold tracking-normal", alert ? "text-warning" : "text-ink")}>
            {alert && <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
            {title}
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">{hint}</p>
        </div>
        <span
          className={cn(
            "inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-2 text-[13px] font-semibold tabular",
            items.length === 0 ? "bg-cream text-ink-muted" : tone === "warning" ? "bg-warning text-white" : tone === "success" ? "bg-success-50 text-success" : "bg-brand text-white",
          )}
        >
          {items.length}
        </span>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-ink-muted">Nothing here.</p>
      ) : (
        <ul className="space-y-2.5 p-3">
          {items.map((o) => (
            <DeliveryCard key={o.id} order={o} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DeliveryCard({ order: o }: { order: OrderListItemDTO }) {
  const done = o.status === "delivered" || o.status === "completed";
  return (
    <li className="relative rounded-xl border border-line bg-ivory/60 px-3.5 py-3 transition-colors hover:border-brand/40 hover:bg-paper">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/admin/orders/${o.id}`} className="font-semibold text-ink after:absolute after:inset-0 after:rounded-xl hover:text-brand">
          {o.orderNumber}
        </Link>
        <span className="font-semibold text-ink tabular">{formatMoney(o.total, o.currency)}</span>
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-ink">
        <Clock className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
        <span className="tabular">{o.timeWindowLabel || "Any time"}</span>
      </p>
      <p className="mt-1 flex items-start gap-1.5 text-[13px] text-ink-soft">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
        <span className="min-w-0 break-words">{o.zone || o.methodName}</span>
      </p>
      <p className="mt-1 truncate text-[13px] text-ink-soft">{o.customerName}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {o.status !== "ready" && o.status !== "out_for_delivery" && o.status !== "delivery_failed" && (
          <Badge tone={statusTone(o.status)}>{orderStatusLabel(o.status, "delivery")}</Badge>
        )}
        {o.courierName ? (
          <Badge tone="neutral">
            <Truck className="h-3 w-3" aria-hidden="true" /> {o.courierName}
          </Badge>
        ) : (
          <Badge tone={done ? "neutral" : "warning"}>No courier</Badge>
        )}
      </div>
    </li>
  );
}
