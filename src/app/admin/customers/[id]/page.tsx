import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CheckCircle2, Mail, MapPin, Phone, XCircle } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guards";
import { getCustomer } from "@/lib/services/admin";
import { loadSettings } from "@/lib/services/settings";
import { hasPermission } from "@/lib/domain/roles";
import { AdminPageHeader, MobileCards, NoAccess, Panel, StatCard, Table, td, th } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/components/store/status-tone";
import { formatMoney } from "@/lib/domain/money";
import { orderStatusLabel, PAYMENT_STATUS_LABELS } from "@/lib/domain/orders";
import { formatDateTime } from "@/lib/domain/time";
import { CustomerStatus } from "./customer-status";

export const metadata = { title: "Customer" };

const DAY: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
const STAMP: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" };

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  );
}

function YesNo({ value, yes, no }: { value: boolean; yes: string; no: string }) {
  return value ? (
    <span className="inline-flex items-center gap-1.5 text-success">
      <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {yes}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-ink-muted">
      <XCircle className="h-4 w-4" aria-hidden="true" /> {no}
    </span>
  );
}

export default async function AdminCustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  await connection();
  const { id } = await params;
  const { user, allowed } = await requireStaffPage(`/admin/customers/${id}`, "customers:read");
  if (!allowed) return <NoAccess what="customers" />;
  const [customer, settings] = await Promise.all([getCustomer(id), loadSettings()]);
  if (!customer || customer.role !== "customer") notFound();
  const tz = settings.timeZone;
  const money = (v: number) => formatMoney(v, settings.currency);
  const canManage = hasPermission(user.role, "settings:manage");
  const active = customer.status === "active";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={customer.name}
        crumbs={[{ label: "Customers", href: "/admin/customers" }, { label: customer.name }]}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={active ? "success" : "danger"} dot>
              {active ? "Active account" : "Disabled account"}
            </Badge>
            <span>Customer since {formatDateTime(customer.createdAt, tz, DAY)}</span>
          </span>
        }
        actions={canManage ? <CustomerStatus id={customer.id} name={customer.name} status={active ? "active" : "disabled"} /> : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Orders" value={customer.orderCount} hint="Excluding cancelled orders" />
        <StatCard label="Order value" value={money(customer.orderValue)} hint="Excluding cancelled orders" />
        <StatCard label="Saved addresses" value={customer.addressCount} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        <div className="space-y-6">
          <Panel title="Contact">
            <ul className="space-y-3 text-sm">
              <li className="flex min-w-0 items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <a href={`mailto:${customer.email}`} className="min-w-0 break-all font-medium text-ink hover:text-brand">
                  {customer.email}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                {customer.phone ? (
                  <a href={`tel:${customer.phone}`} className="font-medium text-ink hover:text-brand">
                    {customer.phone}
                  </a>
                ) : (
                  <span className="text-ink-muted">No phone number</span>
                )}
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <span className="text-ink-soft">
                  {customer.addressCount} saved {customer.addressCount === 1 ? "address" : "addresses"}
                </span>
              </li>
            </ul>
          </Panel>

          <Panel title="Account">
            <dl className="-my-2.5 divide-y divide-line">
              <Fact label="Joined">{formatDateTime(customer.createdAt, tz, STAMP)}</Fact>
              <Fact label="Last sign-in">{customer.lastLoginAt ? formatDateTime(customer.lastLoginAt, tz, STAMP) : <span className="text-ink-muted">Never</span>}</Fact>
              <Fact label="Email">
                <YesNo value={customer.emailVerified} yes="Verified" no="Not verified" />
              </Fact>
              <Fact label="Marketing emails">
                <YesNo value={customer.marketingOptIn} yes="Opted in" no="Not opted in" />
              </Fact>
              <Fact label="Status">
                <Badge tone={active ? "success" : "danger"}>{active ? "Active" : "Disabled"}</Badge>
              </Fact>
            </dl>
          </Panel>
        </div>

        <Panel title="Orders" description={customer.orders.length >= 50 ? "Showing the 50 most recent orders" : undefined} padded={false}>
          {customer.orders.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-muted">This customer has not placed any orders yet.</p>
          ) : (
            <>
              <Table className="[&_table]:min-w-[560px]">
                <thead>
                  <tr>
                    <th className={th}>Order</th>
                    <th className={th}>Placed</th>
                    <th className={th}>Status</th>
                    <th className={th}>Payment</th>
                    <th className={`${th} text-right`}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((o) => (
                    <tr key={o.id} className="group hover:bg-cream/50">
                      <td className={td}>
                        <Link href={`/admin/orders/${o.id}`} className="font-semibold text-ink group-hover:text-brand">
                          {o.orderNumber}
                        </Link>
                        <p className="text-xs text-ink-muted">{o.fulfillment === "pickup" ? "Pickup" : "Delivery"}</p>
                      </td>
                      <td className={`${td} whitespace-nowrap text-ink-soft`}>{formatDateTime(o.createdAt, tz, STAMP)}</td>
                      <td className={td}>
                        <Badge tone={statusTone(o.status)}>{orderStatusLabel(o.status, o.fulfillment)}</Badge>
                      </td>
                      <td className={`${td} text-ink-soft`}>{PAYMENT_STATUS_LABELS[o.paymentStatus]}</td>
                      <td className={`${td} text-right font-semibold tabular ${o.status === "cancelled" ? "text-ink-muted line-through" : ""}`}>{money(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <MobileCards>
                {customer.orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="block px-4 py-4 active:bg-cream">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink">{o.orderNumber}</span>
                        <span className={`font-semibold tabular ${o.status === "cancelled" ? "text-ink-muted line-through" : ""}`}>{money(o.total)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone={statusTone(o.status)}>{orderStatusLabel(o.status, o.fulfillment)}</Badge>
                        <span className="text-xs text-ink-muted">
                          {formatDateTime(o.createdAt, tz, STAMP)} · {PAYMENT_STATUS_LABELS[o.paymentStatus]}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </MobileCards>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
