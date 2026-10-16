import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line-strong bg-paper/60 px-6 py-14 text-center", className)}>
      {icon && <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand">{icon}</div>}
      <h3 className="font-display text-2xl text-ink">{title}</h3>
      {description && <div className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{description}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
