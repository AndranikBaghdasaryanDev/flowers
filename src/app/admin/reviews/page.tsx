import { Suspense } from "react";
import { connection } from "next/server";
import { MessageSquareText } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guards";
import { listReviewsAdmin } from "@/lib/services/admin";
import { loadSettings } from "@/lib/services/settings";
import { AdminPageHeader, FilterLink, NoAccess } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ReviewList } from "./review-moderation";

export const metadata = { title: "Reviews" };

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const EMPTY: Record<string, string> = {
  "": "No reviews have been written yet. Reviews from customers will appear here for moderation.",
  pending: "Nothing waiting for moderation. New reviews will appear here.",
  approved: "No approved reviews yet.",
  rejected: "No rejected reviews.",
};

async function ReviewsContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { allowed } = await requireStaffPage("/admin/reviews", "reviews:manage");
  if (!allowed) return <NoAccess what="reviews" />;
  const raw = await searchParams;
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") flat[k] = v;
  const status = STATUS_TABS.some((t) => t.value === flat.status) ? (flat.status ?? "") : "";
  const page = Math.max(1, Math.floor(Number(flat.page ?? 1)) || 1);
  const [result, settings] = await Promise.all([listReviewsAdmin(status || undefined, page), loadSettings()]);
  const params: Record<string, string> = status ? { status } : {};

  return (
    <>
      <AdminPageHeader title="Reviews" description={`${result.total} ${result.total === 1 ? "review" : "reviews"}${status ? ` · ${status}` : ""}. Only approved reviews are shown on the storefront.`} />
      <div className="mb-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {STATUS_TABS.map((t) => (
          <FilterLink key={t.value} href={t.value ? `/admin/reviews?status=${t.value}` : "/admin/reviews"} active={status === t.value}>
            {t.label}
          </FilterLink>
        ))}
      </div>
      {result.items.length === 0 ? (
        <EmptyState icon={<MessageSquareText className="h-6 w-6" />} title="No reviews here" description={EMPTY[status]} />
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
