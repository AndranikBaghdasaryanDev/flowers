import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { MessageSquareText } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guards";
import { listReviewsAdmin } from "@/lib/services/admin";
import { loadSettings } from "@/lib/services/settings";
import { AdminPageHeader, FilterLink, NoAccess } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { getAdminI18n } from "@/i18n/server";
import { ReviewList } from "./review-moderation";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("admin.reviews.title") };
}

const STATUS_TABS = [
  { value: "", label: "admin.common.all", empty: "admin.reviews.empty.all" },
  { value: "pending", label: "admin.reviews.status.pending", empty: "admin.reviews.empty.pending" },
  { value: "approved", label: "admin.reviews.status.approved", empty: "admin.reviews.empty.approved" },
  { value: "rejected", label: "admin.reviews.status.rejected", empty: "admin.reviews.empty.rejected" },
] as const;

async function ReviewsContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { t } = await getAdminI18n();
  const { allowed } = await requireStaffPage("/admin/reviews", "reviews:manage");
  if (!allowed) return <NoAccess what={t("admin.nav.reviews")} />;
  const raw = await searchParams;
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") flat[k] = v;
  const tab = STATUS_TABS.find((s) => s.value === flat.status) ?? STATUS_TABS[0];
  const status = tab.value;
  const page = Math.max(1, Math.floor(Number(flat.page ?? 1)) || 1);
  const [result, settings] = await Promise.all([listReviewsAdmin(status || undefined, page), loadSettings()]);
  const params: Record<string, string> = status ? { status } : {};

  return (
    <>
      <AdminPageHeader
        title={t("admin.reviews.title")}
        description={`${t("admin.reviews.count", { count: result.total })}${status ? ` · ${t(tab.label)}` : ""}. ${t("admin.reviews.onlyApproved")}`}
      />
      <div className="mb-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {STATUS_TABS.map((s) => (
          <FilterLink key={s.value} href={s.value ? `/admin/reviews?status=${s.value}` : "/admin/reviews"} active={status === s.value}>
            {t(s.label)}
          </FilterLink>
        ))}
      </div>
      {result.items.length === 0 ? (
        <EmptyState icon={<MessageSquareText className="h-6 w-6" />} title={t("admin.reviews.emptyTitle")} description={t(tab.empty)} />
      ) : (
        <ReviewList items={result.items} timeZone={settings.timeZone} />
      )}
      <Pagination className="mt-6" page={result.page} pageCount={result.pageCount} basePath="/admin/reviews" params={params} />
    </>
  );
}

export default function AdminReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-cream" />}>
      <ReviewsContent searchParams={searchParams} />
    </Suspense>
  );
}
