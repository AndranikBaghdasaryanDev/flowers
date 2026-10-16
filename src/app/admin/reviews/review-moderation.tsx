"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ExternalLink, RotateCcw, Star, X } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";
import { cn } from "@/lib/cn";

type ReviewStatus = "pending" | "approved" | "rejected";

export type AdminReview = {
  id: string;
  productName: string;
  productSlug: string;
  rating: number;
  title: string;
  body: string;
  authorName: string;
  status: string;
  createdAt: string;
};

const STATUS: Record<ReviewStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

const asStatus = (s: string): ReviewStatus => (s === "approved" || s === "rejected" ? s : "pending");

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("h-4 w-4", i <= rating ? "fill-current text-brand" : "text-ink-muted opacity-30")} aria-hidden="true" />
      ))}
    </span>
  );
}

export function ReviewList({ items, timeZone }: { items: AdminReview[]; timeZone: string }) {
  return (
    <ul className="space-y-4">
      {items.map((r) => (
        <li key={r.id}>
          <ReviewCard review={r} timeZone={timeZone} />
        </li>
      ))}
    </ul>
  );
}

function ReviewCard({ review, timeZone }: { review: AdminReview; timeZone: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<ReviewStatus | null>(null);
  const status = asStatus(review.status);
  const date = new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(review.createdAt));

  const moderate = async (to: ReviewStatus) => {
    setBusy(to);
    try {
      await api<{ status: ReviewStatus }>(`/api/admin/reviews/${review.id}`, { method: "PATCH", body: { status: to } });
      toast.success(to === "approved" ? "Review approved" : to === "rejected" ? "Review rejected" : "Review moved back to pending");
      router.refresh();
    } catch (e) {
      toast.error("Review not updated", errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="rounded-2xl border border-line bg-paper p-5" aria-labelledby={`review-${review.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {review.productSlug ? (
            <a
              href={`/products/${review.productSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline"
            >
              {review.productName}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            <span className="text-[13px] font-semibold text-ink-muted">{review.productName}</span>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Stars rating={review.rating} />
            <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>
          </div>
        </div>
        <p className="text-xs text-ink-muted">
          <span className="font-semibold text-ink-soft">{review.authorName}</span> · {date}
        </p>
      </div>

      <h3 id={`review-${review.id}`} className={cn("mt-3 font-sans text-[15px] font-semibold tracking-normal text-ink", !review.title && "sr-only")}>
        {review.title || `Review by ${review.authorName}`}
      </h3>
      <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-ink-soft">{review.body}</p>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
        {status !== "approved" && (
          <Button size="sm" variant="primary" icon={<Check className="h-4 w-4" />} loading={busy === "approved"} disabled={busy !== null} onClick={() => moderate("approved")}>
            Approve
          </Button>
        )}
        {status !== "rejected" && (
          <Button
            size="sm"
            variant="outline"
            className="hover:!border-danger hover:!text-danger"
            icon={<X className="h-4 w-4" />}
            loading={busy === "rejected"}
            disabled={busy !== null}
            onClick={() => moderate("rejected")}
          >
            Reject
          </Button>
        )}
        {status !== "pending" && (
          <Button size="sm" variant="ghost" icon={<RotateCcw className="h-4 w-4" />} loading={busy === "pending"} disabled={busy !== null} onClick={() => moderate("pending")}>
            Back to pending
          </Button>
        )}
      </div>
    </article>
  );
}
