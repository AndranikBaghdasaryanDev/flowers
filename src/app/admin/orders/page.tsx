import { Suspense } from "react";
import type { Metadata } from "next";
import { Link } from "@/i18n/client";
import { connection } from "next/server";
import { Download, Truck, Store } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guards";
import { listOrdersAdmin } from "@/lib/services/orders";
import { loadSettings } from "@/lib/services/settings";
import { orderListQuerySchema } from "@/lib/validation";
import { AdminPageHeader, FilterLink, MobileCards, NoAccess, Panel, Table, td, th } from "@/components/admin/ui";
import { DateRangeFilter, SearchBox, SelectFilter } from "@/components/admin/query-controls";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { statusTone } from "@/components/store/status-tone";
import type { OrderStatus, PaymentStatus } from "@/lib/domain/orders";
import { buttonClasses } from "@/components/ui/button";
import { getAdminI18n } from "@/i18n/server";
import { paymentMethodLabel, paymentStatusLabel, statusLabel } from "@/i18n/labels";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("admin.orders.title") };
}

const STATUS_TABS: ("" | OrderStatus)[] = ["", "pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivery_failed", "delivered", "completed", "cancelled"];

function paymentTone(s: PaymentStatus) {
  return s === "paid" ? "success" : s === "refunded" ? "info" : s === "voided" ? "neutral" : "warning";
}

async function OrdersContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { t, f } = await getAdminI18n();
  const { allowed } = await requireStaffPage("/admin/orders", "orders:read");
  if (!allowed) return <NoAccess what={t("admin.nav.orders")} />;
  const raw = await searchParams;
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") flat[k] = v;
  const parsed = orderListQuerySchema.safeParse(flat);
  const query = parsed.success ? parsed.data : {};
  const [result, settings] = await Promise.all([listOrdersAdmin(query), loadSettings()]);
  const tz = settings.timeZone;
  const status = flat.status ?? "";
  const qs = (changes: Record<string, string | null>) => {
    const sp = new URLSearchParams(flat);
    for (const [k, v] of Object.entries(changes)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    const s = sp.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };
  const exportHref = `/api/admin/orders/export?${new URLSearchParams(flat).toString()}`;

  return (
    <>
      <AdminPageHeader
        title={t("admin.orders.title")}
        description={t("admin.orders.matchCount", { count: result.total })}
        actions={
          <a href={exportHref} className={buttonClasses("outline", "sm")}>
            <Download className="h-4 w-4" /> {t("admin.orders.exportCsv")}
          </a>
        }
      />
      <div className="mb-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {STATUS_TABS.map((s) => (
          <FilterLink key={s} href={qs({ status: s || null })} active={status === s}>
            {s ? statusLabel(t, s) : t("admin.common.all")}
          </FilterLink>
        ))}
      </div>
      <div className="mb-5 flex flex-col gap-3">
        <DateRangeFilter withDateField />
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox placeholder={t("admin.orders.searchPlaceholder")} />
          <SelectFilter
            param="payment"
            label={t("admin.orders.payment")}
            options={[
              { value: "", label: t("admin.orders.anyPayment") },
              ...(["unpaid", "paid", "refunded", "voided"] as const).map((s) => ({ value: s, label: paymentStatusLabel(t, s) })),
            ]}
          />
          <SelectFilter
            param="fulfillment"
            label={t("admin.orders.method")}
            options={[
              { value: "", label: t("admin.orders.deliveryAndPickup") },
              { value: "delivery", label: t("admin.orders.delivery") },
              { value: "pickup", label: t("admin.orders.pickup") },
            ]}
          />
          <SelectFilter
            param="sort"
            label={t("admin.orders.sort")}
            options={[
              { value: "", label: t("admin.orders.sortNewest") },
              { value: "oldest", label: t("admin.orders.sortOldest") },
              { value: "delivery_date", label: t("admin.orders.sortDeliveryDate") },
              { value: "total_desc", label: t("admin.orders.sortTotalDesc") },
              { value: "total_asc", label: t("admin.orders.sortTotalAsc") },
            ]}
          />
        </div>
      </div>

      <Panel padded={false}>
        {result.items.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-ink-muted">{t("admin.orders.empty")}</p>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th className={th}>{t("admin.orders.order")}</th>
                  <th className={th}>{t("admin.orders.customer")}</th>
                  <th className={th}>{t("admin.orders.placed")}</th>
                  <th className={th}>{t("admin.orders.fulfilment")}</th>
                  <th className={th}>{t("admin.common.status")}</th>
                  <th className={th}>{t("admin.orders.payment")}</th>
                  <th className={`${th} text-right`}>{t("admin.orders.total")}</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((o) => (
                  <tr key={o.id} className="group hover:bg-cream/50">
                    <td className={td}>
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold text-ink after:absolute group-hover:text-brand">
                        {o.orderNumber}
                      </Link>
                      <p className="text-xs text-ink-muted">{t("admin.orders.itemCount", { count: o.itemCount })}</p>
                    </td>
                    <td className={td}>
                      <p className="font-medium text-ink">{o.customerName}</p>
                      <p className="text-xs text-ink-muted">{o.customerPhone}</p>
                    </td>
                    <td className={`${td} whitespace-nowrap text-ink-soft`}>{f.dateTime(o.createdAt, tz, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className={td}>
                      <p className="flex items-center gap-1.5 font-medium text-ink">
                        {o.fulfillmentType === "pickup" ? <Store className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />}
                        {f.dateKey(o.deliveryDate, { day: "numeric", month: "short" })} {o.timeWindowLabel && <span className="text-ink-muted">· {o.timeWindowLabel}</span>}
                      </p>
                      <p className="text-xs text-ink-muted">{[o.zone, o.courierName && t("admin.orders.courierName", { name: o.courierName })].filter(Boolean).join(" · ") || o.methodName}</p>
                    </td>
                    <td className={td}>
                      <Badge tone={statusTone(o.status)}>{statusLabel(t, o.status, o.fulfillmentType)}</Badge>
                    </td>
                    <td className={td}>
                      <Badge tone={paymentTone(o.paymentStatus)}>{paymentStatusLabel(t, o.paymentStatus)}</Badge>
                      <p className="mt-0.5 text-xs text-ink-muted">{paymentMethodLabel(t, o.paymentMethod)}</p>
                    </td>
                    <td className={`${td} text-right font-semibold tabular`}>{f.money(o.total, o.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <MobileCards>
              {result.items.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="block px-4 py-4 active:bg-cream">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{o.orderNumber}</span>
                      <span className="font-semibold tabular">{f.money(o.total, o.currency)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-soft">{o.customerName} · {o.customerPhone}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone(o.status)}>{statusLabel(t, o.status, o.fulfillmentType)}</Badge>
                      <Badge tone={paymentTone(o.paymentStatus)}>{paymentStatusLabel(t, o.paymentStatus)}</Badge>
                      <span className="text-xs text-ink-muted">
                        {o.fulfillmentType === "pickup" ? t("admin.orders.pickup") : t("admin.orders.delivery")} {f.dateKey(o.deliveryDate, { day: "numeric", month: "short" })} {o.timeWindowLabel}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </MobileCards>
          </>
        )}
      </Panel>
      <Pagination className="mt-6" page={result.page} pageCount={result.pageCount} basePath="/admin/orders" params={flat} />
    </>
  );
}

export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-cream" />}>
      <OrdersContent searchParams={searchParams} />
    </Suspense>
  );
}
