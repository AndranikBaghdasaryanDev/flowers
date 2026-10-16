import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Download, Mail } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guards";
import { listCustomers, listSubscribers } from "@/lib/services/admin";
import { loadSettings } from "@/lib/services/settings";
import { AdminPageHeader, MobileCards, NoAccess, Panel, Table, td, th } from "@/components/admin/ui";
import { SearchBox } from "@/components/admin/query-controls";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { buttonClasses } from "@/components/ui/button";
import { formatMoney } from "@/lib/domain/money";
import { formatDateTime } from "@/lib/domain/time";

export const metadata = { title: "Customers" };

const DAY: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

async function CustomersContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { allowed } = await requireStaffPage("/admin/customers", "customers:read");
  if (!allowed) return <NoAccess what="customers" />;
  const raw = await searchParams;
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") flat[k] = v;
  const q = flat.q?.trim().slice(0, 80) || undefined;
  const page = Math.max(1, Math.floor(Number(flat.page ?? 1)) || 1);
  const [result, subscribers, settings] = await Promise.all([listCustomers(q, page), listSubscribers(1), loadSettings()]);
  const tz = settings.timeZone;
  const money = (v: number) => formatMoney(v, settings.currency);

  return (
    <>
      <AdminPageHeader
        title="Customers"
        description={q ? `${result.total} ${result.total === 1 ? "customer matches" : "customers match"} “${q}”` : `${result.total} registered ${result.total === 1 ? "customer" : "customers"}`}
      />

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-line bg-paper p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand" aria-hidden="true">
            <Mail className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-ink">Newsletter subscribers</p>
            <p className="text-sm text-ink-muted">
              <span className="font-semibold text-ink tabular">{subscribers.total}</span> {subscribers.total === 1 ? "address is" : "addresses are"} currently subscribed
            </p>
          </div>
        </div>
        <a href="/api/admin/subscribers/export" className={buttonClasses("outline", "sm", "self-start sm:self-auto")}>
          <Download className="h-4 w-4" /> Export CSV
        </a>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Name, email or phone" />
      </div>

      <Panel padded={false}>
        {result.items.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-ink-muted">{q ? "No customers match this search." : "No customers have registered yet."}</p>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th className={th}>Customer</th>
                  <th className={th}>Phone</th>
                  <th className={`${th} text-right`}>Orders</th>
                  <th className={`${th} text-right`}>Order value</th>
                  <th className={th}>Last order</th>
                  <th className={th}>Joined</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((c) => (
                  <tr key={c.id} className="group hover:bg-cream/50">
                    <td className={td}>
                      <Link href={`/admin/customers/${c.id}`} className="font-semibold text-ink group-hover:text-brand">
                        {c.name}
                      </Link>
                      <p className="max-w-[260px] truncate text-xs text-ink-muted">{c.email}</p>
                    </td>
                    <td className={`${td} whitespace-nowrap text-ink-soft`}>{c.phone || <span className="text-ink-muted">—</span>}</td>
                    <td className={`${td} text-right tabular`}>{c.orderCount}</td>
                    <td className={`${td} text-right font-semibold tabular`}>{money(c.orderValue)}</td>
                    <td className={`${td} whitespace-nowrap text-ink-soft`}>{c.lastOrderAt ? formatDateTime(c.lastOrderAt, tz, DAY) : <span className="text-ink-muted">Never</span>}</td>
                    <td className={`${td} whitespace-nowrap text-ink-soft`}>{formatDateTime(c.createdAt, tz, DAY)}</td>
                    <td className={td}>
                      <Badge tone={c.status === "active" ? "success" : "danger"}>{c.status === "active" ? "Active" : "Disabled"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <MobileCards>
              {result.items.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/customers/${c.id}`} className="block px-4 py-4 active:bg-cream">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-semibold text-ink">{c.name}</span>
                      <Badge tone={c.status === "active" ? "success" : "danger"}>{c.status === "active" ? "Active" : "Disabled"}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-ink-soft">{[c.email, c.phone].filter(Boolean).join(" · ")}</p>
                    <p className="mt-2 text-xs text-ink-muted">
                      <span className="font-semibold text-ink tabular">{c.orderCount}</span> {c.orderCount === 1 ? "order" : "orders"} ·{" "}
                      <span className="font-semibold text-ink tabular">{money(c.orderValue)}</span>
                      {c.lastOrderAt && <> · last {formatDateTime(c.lastOrderAt, tz, DAY)}</>} · joined {formatDateTime(c.createdAt, tz, DAY)}
                    </p>
                  </Link>
                </li>
              ))}
            </MobileCards>
          </>
        )}
      </Panel>
      <Pagination className="mt-6" page={result.page} pageCount={result.pageCount} basePath="/admin/customers" params={flat} />
    </>
  );
}

export default function AdminCustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-cream" />}>
      <CustomersContent searchParams={searchParams} />
    </Suspense>
  );
}
