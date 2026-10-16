"use client";

import { Link, useT } from "@/i18n/client";
import type { ReactNode } from "react";
import { ShieldAlert, ChevronRight } from "lucide-react";

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
  const t = useT();
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {crumbs && (
          <nav aria-label={t("common.breadcrumb")} className="mb-2">
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

/** Shown when the signed-in role lacks the permission; `what` is the (translated) section name. */
export function NoAccess({ what }: { what?: string }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-paper px-6 py-16 text-center">
      <ShieldAlert className="h-8 w-8 text-ink-muted" />
      <h1 className="mt-4 font-display text-2xl text-ink">{what ? t("admin.common.noAccessTo", { what }) : t("admin.common.noAccess")}</h1>
      <p className="mt-2 max-w-md text-sm text-ink-muted">{t("admin.common.noAccessHint")}</p>
    </div>
  );
}
