"use client";

import { Link, useT } from "@/i18n/client";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useT();
  return (
    <nav aria-label={t("common.breadcrumb")}>
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-ink-muted">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />}
            {c.href ? (
              <Link href={c.href} className="hover:text-brand">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink-soft">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ eyebrow, title, description, crumbs, children }: { eyebrow?: string; title: string; description?: ReactNode; crumbs?: Crumb[]; children?: ReactNode }) {
  return (
    <header className="container-page pb-8 pt-8 sm:pt-10 lg:pb-12">
      {crumbs && <Breadcrumbs items={crumbs} />}
      <div className="mt-6 max-w-3xl">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-3 font-display text-[2.6rem] leading-[1.05] text-ink sm:text-[3.4rem]">{title}</h1>
        {description && <div className="mt-4 text-[16px] leading-relaxed text-ink-soft">{description}</div>}
      </div>
      {children}
    </header>
  );
}
