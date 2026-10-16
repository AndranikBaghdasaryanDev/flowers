import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** Link-based pagination that preserves the current query string. */
export function Pagination({
  page,
  pageCount,
  basePath,
  params,
  className,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  params: Record<string, string | undefined>;
  className?: string;
}) {
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const pages: (number | "…")[] = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  const item = "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors";
  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-center gap-1.5", className)}>
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(item, "text-ink hover:bg-cream")} aria-label="Previous page" scroll>
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cn(item, "text-ink-muted/50")} aria-hidden="true">
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-ink-muted" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(item, p === page ? "bg-brand text-white" : "text-ink hover:bg-cream")}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={href(page + 1)} className={cn(item, "text-ink hover:bg-cream")} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cn(item, "text-ink-muted/50")} aria-hidden="true">
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
