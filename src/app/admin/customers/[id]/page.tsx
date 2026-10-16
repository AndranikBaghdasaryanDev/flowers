import type { ReactNode } from "react";
import { Link } from "@/i18n/client";
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
import { getAdminI18n } from "@/i18n/server";
import { paymentStatusLabel, statusLabel } from "@/i18n/labels";
import { CustomerStatus } from "./customer-status";

export async function generateMetadata() {
  const { t } = await getAdminI18n();
  return { title: t("admin.customers.customer") };
}

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
  const { t, f } = await getAdminI18n();
  if (!allowed) return <NoAccess what={t("admin.nav.customers")} />;
  const [customer, settings] = await Promise.all([getCustomer(id), loadSettings()]);
  if (!customer || customer.role !== "customer") notFound();
  const tz = settings.timeZone;
  const money = (v: number) => f.money(v, settings.currency);
  const canManage = hasPermission(user.role, "settings:manage");
  const active = customer.status === "active";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={customer.name}
        crumbs={[{ label: t("admin.nav.customers"), href: "/admin/customers" }, { label: customer.name }]}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={active ? "success" : "danger"} dot>
              {active ? t("admin.customers.activeAccount") : t("admin.customers.disabledAccount")}
            </Badge>
            <span>{t("admin.customers.since", { date: f.dateTime(customer.createdAt, tz, DAY) })}</span>
          </span>
        }
        actions={canManage ? <CustomerStatus id={customer.id} name={customer.name} status={active ? "active" : "disabled"} /> : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t("admin.nav.orders")} value={f.number(customer.orderCount)} hint={t("admin.customers.excludingCancelled")} />
        <StatCard label={t("admin.analytics.orderValue")} value={money(customer.orderValue)} hint={t("admin.customers.excludingCancelled")} />
        <StatCard label={t("admin.customers.savedAddresses")} value={f.number(customer.addressCount)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        <div className="space-y-6">
          <Panel title={t("admin.customers.contact")}>
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
                  <span className="text-ink-muted">{t("admin.customers.noPhone")}</span>
                )}
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <span className="text-ink-soft">
                  {t("admin.customers.addressCount", { count: customer.addressCount })}
                </span>
              </li>
            </ul>
          </Panel>

          <Panel title={t("admin.customers.account")}>
            <dl className="-my-2.5 divide-y divide-line">
              <Fact label={t("admin.customers.joined")}>{f.dateTime(customer.createdAt, tz, STAMP)}</Fact>
              <Fact label={t("admin.customers.lastSignIn")}>{customer.lastLoginAt ? f.dateTime(customer.lastLoginAt, tz, STAMP) : <span className="text-ink-muted">{t("admin.customers.never")}</span>}</Fact>
              <Fact label={t("form.email")}>
                <YesNo value={customer.emailVerified} yes={t("admin.customers.verified")} no={t("admin.customers.notVerified")} />
              </Fact>
              <Fact label={t("admin.customers.marketing")}>
                <YesNo value={customer.marketingOptIn} yes={t("admin.customers.optedIn")} no={t("admin.customers.notOptedIn")} />
              </Fact>
              <Fact label={t("admin.common.status")}>
                <Badge tone={active ? "success" : "danger"}>{active ? t("admin.customers.active") : t("admin.customers.disabled")}</Badge>
              </Fact>
            </dl>
          </Panel>
        </div>

        <Panel title={t("admin.nav.orders")} description={customer.orders.length >= 50 ? t("admin.customers.recent50") : undefined} padded={false}>
          {customer.orders.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-muted">{t("admin.customers.noOrders")}</p>
          ) : (
            <>
              <Table className="[&_table]:min-w-[560px]">
                <thead>
                  <tr>
                    <th className={th}>{t("admin.customers.order")}</th>
                    <th className={th}>{t("admin.analytics.placed")}</th>
                    <th className={th}>{t("admin.common.status")}</th>
                    <th className={th}>{t("admin.customers.payment")}</th>
                    <th className={`${th} text-right`}>{t("admin.customers.total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((o) => (
                    <tr key={o.id} className="group hover:bg-cream/50">
                      <td className={td}>
                        <Link href={`/admin/orders/${o.id}`} className="font-semibold text-ink group-hover:text-brand">
                          {o.orderNumber}
                        </Link>
                        <p className="text-xs text-ink-muted">{o.fulfillment === "pickup" ? t("admin.analytics.pickup") : t("admin.analytics.delivery")}</p>
                      </td>
                      <td className={`${td} whitespace-nowrap text-ink-soft`}>{f.dateTime(o.createdAt, tz, STAMP)}</td>
                      <td className={td}>
                        <Badge tone={statusTone(o.status)}>{statusLabel(t, o.status, o.fulfillment)}</Badge>
                      </td>
                      <td className={`${td} text-ink-soft`}>{paymentStatusLabel(t, o.paymentStatus)}</td>
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
                        <Badge tone={statusTone(o.status)}>{statusLabel(t, o.status, o.fulfillment)}</Badge>
                        <span className="text-xs text-ink-muted">
                          {f.dateTime(o.createdAt, tz, STAMP)} · {paymentStatusLabel(t, o.paymentStatus)}
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
