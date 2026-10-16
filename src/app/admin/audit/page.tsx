import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { listAudit } from "@/lib/services/admin";
import { loadSettings } from "@/lib/services/settings";
import { AdminPageHeader, FilterLink, MobileCards, NoAccess, Panel, Table, td, th } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { formatDateTime } from "@/lib/domain/time";

export const metadata = { title: "Activity log" };

const ENTITY_TABS = [
  { value: "", label: "All" },
  { value: "order", label: "Orders" },
  { value: "product", label: "Products" },
  { value: "category", label: "Categories" },
  { value: "settings", label: "Settings" },
  { value: "user", label: "Users" },
  { value: "delivery_method", label: "Delivery methods" },
  { value: "courier", label: "Couriers" },
  { value: "review", label: "Reviews" },
  { value: "gallery", label: "Gallery" },
];

const ENTITY_LABELS: Record<string, string> = {
  order: "Order",
  product: "Product",
  category: "Category",
  settings: "Settings",
  user: "User",
  delivery_method: "Delivery method",
  courier: "Courier",
  review: "Review",
  gallery: "Gallery",
};
const entityLabel = (e: string) => ENTITY_LABELS[e] ?? e.replace(/_/g, " ");

const STAMP: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" };

async function AuditContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { allowed } = await requireStaffPage("/admin/audit", "audit:read");
  if (!allowed) return <NoAccess what="the activity log" />;
  const raw = await searchParams;
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") flat[k] = v;
  const entity = ENTITY_TABS.some((t) => t.value === flat.entity) ? (flat.entity ?? "") : "";
  const page = Math.max(1, Math.floor(Number(flat.page ?? 1)) || 1);
  const [result, settings] = await Promise.all([listAudit(page, entity || undefined), loadSettings()]);
  const tz = settings.timeZone;
  const params: Record<string, string> = entity ? { entity } : {};

  return (
    <>
      <AdminPageHeader
        title="Activity log"
        description={`${result.total} recorded ${result.total === 1 ? "action" : "actions"} · times shown in ${tz}`}
      />
      <div className="mb-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {ENTITY_TABS.map((t) => (
          <FilterLink key={t.value} href={t.value ? `/admin/audit?entity=${t.value}` : "/admin/audit"} active={entity === t.value}>
            {t.label}
          </FilterLink>
        ))}
      </div>

      <Panel padded={false}>
        {result.items.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-ink-muted">No activity recorded{entity ? " for this type" : ""} yet.</p>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th className={th}>Time</th>
                  <th className={th}>Who</th>
                  <th className={th}>What</th>
                  <th className={th}>Area</th>
                  <th className={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((a) => (
                  <tr key={a.id}>
                    <td className={`${td} whitespace-nowrap text-ink-soft tabular`}>{formatDateTime(a.createdAt, tz, STAMP)}</td>
                    <td className={`${td} font-medium text-ink`}>{a.actorName}</td>
                    <td className={`${td} text-ink`}>
                      {a.entityType === "order" && a.entityId ? (
                        <Link href={`/admin/orders/${a.entityId}`} className="hover:text-brand hover:underline">
                          {a.summary}
                        </Link>
                      ) : (
                        a.summary
                      )}
                    </td>
                    <td className={td}>
                      <Badge>{entityLabel(a.entityType)}</Badge>
                    </td>
                    <td className={`${td} whitespace-nowrap font-mono text-xs text-ink-muted`}>{a.action}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <MobileCards>
              {result.items.map((a) => (
                <li key={a.id} className="px-4 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{a.actorName}</span>
                    <Badge>{entityLabel(a.entityType)}</Badge>
                  </div>
                  <p className="mt-1 break-words text-sm text-ink-soft">
                    {a.entityType === "order" && a.entityId ? (
                      <Link href={`/admin/orders/${a.entityId}`} className="hover:text-brand hover:underline">
                        {a.summary}
                      </Link>
                    ) : (
                      a.summary
                    )}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted tabular">
                    {formatDateTime(a.createdAt, tz, STAMP)} · <span className="font-mono">{a.action}</span>
                  </p>
                </li>
              ))}
            </MobileCards>
          </>
        )}
      </Panel>
      <Pagination className="mt-6" page={result.page} pageCount={result.pageCount} basePath="/admin/audit" params={params} />
    </>
  );
}

export default function AdminAuditPage({ searchParams }: PageProps<"/admin/audit">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-cream" />}>
      <AuditContent searchParams={searchParams} />
    </Suspense>
  );
}
