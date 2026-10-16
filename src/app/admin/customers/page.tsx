import { Suspense } from "react";
import { Link } from "@/i18n/client";
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
import { getAdminI18n } from "@/i18n/server";

/** A file download from an API route, not a page navigation. */
const SUBSCRIBERS_CSV = "/api/admin/subscribers/export";

export async function generateMetadata() {
  const { t } = await getAdminI18n();
  return { title: t("admin.nav.customers") };
}

const DAY: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

async function CustomersContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { allowed } = await requireStaffPage("/admin/customers", "customers:read");
  const { t, f } = await getAdminI18n();
  if (!allowed) return <NoAccess what={t("admin.nav.customers")} />;
  const raw = await searchParams;
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") flat[k] = v;
  const q = flat.q?.trim().slice(0, 80) || undefined;
  const page = Math.max(1, Math.floor(Number(flat.page ?? 1)) || 1);
  const [result, subscribers, settings] = await Promise.all([listCustomers(q, page), listSubscribers(1), loadSettings()]);
  const tz = settings.timeZone;
  const money = (v: number) => f.money(v, settings.currency);
  const day = (d: Date | string) => f.dateTime(d, tz, DAY);
  const bold = (c: string) => <span className="font-semibold text-ink tabular">{c}</span>;

  return (
    <>
      <AdminPageHeader
        title={t("admin.nav.customers")}
        description={q ? t("admin.customers.matches", { count: result.total, q }) : t("admin.customers.registered", { count: result.total })}
      />

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-line bg-paper p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand" aria-hidden="true">
            <Mail className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-ink">{t("admin.customers.subscribers")}</p>
            <p className="text-sm text-ink-muted">
              {t.rich("admin.customers.subscribedCount", { b: bold }, { count: subscribers.total })}
            </p>
          </div>
        </div>
        <a href={SUBSCRIBERS_CSV} download className={buttonClasses("outline", "sm", "self-start sm:self-auto")}>
          <Download className="h-4 w-4" /> {t("admin.analytics.exportCsv")}
        </a>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <SearchBox placeholder={t("admin.customers.search")} />
      </div>

      <Panel padded={false}>
        {result.items.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-ink-muted">{q ? t("admin.customers.noMatches") : t("admin.customers.none")}</p>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th className={th}>{t("admin.customers.customer")}</th>
                  <th className={th}>{t("form.phone")}</th>
                  <th className={`${th} text-right`}>{t("admin.nav.orders")}</th>
                  <th className={`${th} text-right`}>{t("admin.analytics.orderValue")}</th>
                  <th className={th}>{t("admin.customers.lastOrder")}</th>
                  <th className={th}>{t("admin.customers.joined")}</th>
                  <th className={th}>{t("admin.common.status")}</th>
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
                    <td className={`${td} whitespace-nowrap text-ink-soft`}>{c.lastOrderAt ? day(c.lastOrderAt) : <span className="text-ink-muted">{t("admin.customers.never")}</span>}</td>
                    <td className={`${td} whitespace-nowrap text-ink-soft`}>{day(c.createdAt)}</td>
                    <td className={td}>
                      <Badge tone={c.status === "active" ? "success" : "danger"}>{c.status === "active" ? t("admin.customers.active") : t("admin.customers.disabled")}</Badge>
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
                      <Badge tone={c.status === "active" ? "success" : "danger"}>{c.status === "active" ? t("admin.customers.active") : t("admin.customers.disabled")}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-ink-soft">{[c.email, c.phone].filter(Boolean).join(" · ")}</p>
                    <p className="mt-2 text-xs text-ink-muted">
                      {t.rich("admin.customers.ordersCount", { b: bold }, { count: c.orderCount })} · {bold(money(c.orderValue))}
                      {c.lastOrderAt && <> · {t("admin.customers.lastOn", { date: day(c.lastOrderAt) })}</>} · {t("admin.customers.joinedOn", { date: day(c.createdAt) })}
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
