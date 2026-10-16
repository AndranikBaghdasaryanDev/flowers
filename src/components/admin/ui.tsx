import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldAlert, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** Page title + breadcrumbs + actions for admin screens. */
export function AdminPageHeader({
  title,
  description,
  crumbs,
  actions,
}: {
  title: string;
  description?: ReactNode;
  crumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-2">
            <ol className="flex flex-wrap items-center gap-1 text-[12.5px] text-ink-muted">
              {crumbs.map((c, i) => (
                <li key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
                  {c.href ? (
                    <Link href={c.href} className="hover:text-brand">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current="page">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="font-display text-[2rem] leading-tight text-ink sm:text-[2.3rem]">{title}</h1>
        {description && <div className="mt-1 text-sm text-ink-muted">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, actions, children, className, padded = true }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-paper", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="font-sans text-[15px] font-semibold tracking-normal text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={padded ? "p-5" : undefined}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, href, tone }: { label: string; value: ReactNode; hint?: ReactNode; href?: string; tone?: "brand" | "warning" | "neutral" }) {
  const body = (
    <>
      <p className="text-[12.5px] font-semibold text-ink-muted">{label}</p>
      <p className={cn("mt-2 text-[1.75rem] font-semibold leading-none tabular", tone === "warning" ? "text-warning" : "text-ink")}>{value}</p>
      {hint && <p className="mt-2 text-[12.5px] text-ink-muted">{hint}</p>}
    </>
  );
  const cls = "block rounded-2xl border border-line bg-paper p-5 transition-colors";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-brand/40")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function NoAccess({ what = "this section" }: { what?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-paper px-6 py-16 text-center">
      <ShieldAlert className="h-8 w-8 text-ink-muted" />
      <h1 className="mt-4 font-display text-2xl text-ink">You don’t have access to {what}</h1>
      <p className="mt-2 max-w-md text-sm text-ink-muted">Ask the store owner to change your role if you need it.</p>
    </div>
  );
}

/** Responsive table: real table on desktop; stacked cards on small screens via `MobileCards`. */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("hidden overflow-x-auto md:block", className)}>
      <table className="w-full min-w-[720px] border-collapse text-left text-[13.5px]">{children}</table>
    </div>
  );
}

export const th = "border-b border-line bg-cream/60 px-4 py-3 text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-muted first:pl-5 last:pr-5";
export const td = "border-b border-line px-4 py-3 align-middle first:pl-5 last:pr-5";

export function MobileCards({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-line md:hidden">{children}</ul>;
}

export function FilterLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
        active ? "border-brand bg-brand text-white" : "border-line bg-paper text-ink-soft hover:border-brand hover:text-brand",
      )}
    >
      {children}
    </Link>
  );
}
