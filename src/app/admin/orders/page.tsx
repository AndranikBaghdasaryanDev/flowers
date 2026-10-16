import { Suspense } from "react";
import Link from "next/link";
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
import { formatMoney } from "@/lib/domain/money";
import { orderStatusLabel, PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS, type PaymentStatus } from "@/lib/domain/orders";
import { formatDateKey, formatDateTime } from "@/lib/domain/time";
import { buttonClasses } from "@/components/ui/button";

export const metadata = { title: "Orders" };

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivery_failed", label: "Failed delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function paymentTone(s: PaymentStatus) {
  return s === "paid" ? "success" : s === "refunded" ? "info" : s === "voided" ? "neutral" : "warning";
}

async function OrdersContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { allowed } = await requireStaffPage("/admin/orders", "orders:read");
  if (!allowed) return <NoAccess what="orders" />;
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
        title="Orders"
        description={`${result.total} ${result.total === 1 ? "order matches" : "orders match"} the current filters`}
        actions={
          <a href={exportHref} className={buttonClasses("outline", "sm")}>
            <Download className="h-4 w-4" /> Export CSV
          </a>
        }
      />
      <div className="mb-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {STATUS_TABS.map((t) => (
          <FilterLink key={t.value} href={qs({ status: t.value || null })} active={status === t.value}>
            {t.label}
          </FilterLink>
        ))}
      </div>
      <div className="mb-5 flex flex-col gap-3">
        <DateRangeFilter withDateField />
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox placeholder="Order №, name, phone, email" />
          <SelectFilter param="payment" label="Payment" options={[{ value: "", label: "Any payment" }, { value: "unpaid", label: "Unpaid" }, { value: "paid", label: "Paid" }, { value: "refunded", label: "Refunded" }, { value: "voided", label: "Voided" }]} />
          <SelectFilter param="fulfillment" label="Method" options={[{ value: "", label: "Delivery & pickup" }, { value: "delivery", label: "Delivery" }, { value: "pickup", label: "Pickup" }]} />
          <SelectFilter param="sort" label="Sort" options={[{ value: "", label: "Newest first" }, { value: "oldest", label: "Oldest first" }, { value: "delivery_date", label: "By delivery date" }, { value: "total_desc", label: "Highest total" }, { value: "total_asc", label: "Lowest total" }]} />
        </div>
      </div>

      <Panel padded={false}>
        {result.items.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-ink-muted">No orders match these filters.</p>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th className={th}>Order</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Placed</th>
                  <th className={th}>Fulfilment</th>
                  <th className={th}>Status</th>
                  <th className={th}>Payment</th>
                  <th className={`${th} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((o) => (
                  <tr key={o.id} className="group hover:bg-cream/50">
                    <td className={td}>
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold text-ink after:absolute group-hover:text-brand">
                        {o.orderNumber}
                      </Link>
                      <p className="text-xs text-ink-muted">{o.itemCount} items</p>
                    </td>
                    <td className={td}>
                      <p className="font-medium text-ink">{o.customerName}</p>
                      <p className="text-xs text-ink-muted">{o.customerPhone}</p>
                    </td>
                    <td className={`${td} whitespace-nowrap text-ink-soft`}>{formatDateTime(o.createdAt, tz, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className={td}>
                      <p className="flex items-center gap-1.5 font-medium text-ink">
                        {o.fulfillmentType === "pickup" ? <Store className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />}
                        {formatDateKey(o.deliveryDate, { day: "numeric", month: "short" })} {o.timeWindowLabel && <span className="text-ink-muted">· {o.timeWindowLabel}</span>}
                      </p>
                      <p className="text-xs text-ink-muted">{[o.zone, o.courierName && `Courier: ${o.courierName}`].filter(Boolean).join(" · ") || o.methodName}</p>
                    </td>
                    <td className={td}>
                      <Badge tone={statusTone(o.status)}>{orderStatusLabel(o.status, o.fulfillmentType)}</Badge>
                    </td>
                    <td className={td}>
                      <Badge tone={paymentTone(o.paymentStatus)}>{PAYMENT_STATUS_LABELS[o.paymentStatus]}</Badge>
                      <p className="mt-0.5 text-xs text-ink-muted">{PAYMENT_METHOD_LABELS[o.paymentMethod]}</p>
                    </td>
                    <td className={`${td} text-right font-semibold tabular`}>{formatMoney(o.total, o.currency)}</td>
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
                      <span className="font-semibold tabular">{formatMoney(o.total, o.currency)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-soft">{o.customerName} · {o.customerPhone}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone(o.status)}>{orderStatusLabel(o.status, o.fulfillmentType)}</Badge>
                      <Badge tone={paymentTone(o.paymentStatus)}>{PAYMENT_STATUS_LABELS[o.paymentStatus]}</Badge>
                      <span className="text-xs text-ink-muted">
                        {o.fulfillmentType === "pickup" ? "Pickup" : "Delivery"} {formatDateKey(o.deliveryDate, { day: "numeric", month: "short" })} {o.timeWindowLabel}
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
