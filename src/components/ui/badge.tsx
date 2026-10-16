import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "sage" | "dark";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-cream text-ink-soft ring-line",
  brand: "bg-brand-50 text-brand ring-brand-200",
  success: "bg-success-50 text-success ring-success/20",
  warning: "bg-warning-50 text-warning ring-warning/20",
  danger: "bg-danger-50 text-danger ring-danger/20",
  info: "bg-info-50 text-info ring-info/20",
  sage: "bg-sage-50 text-sage-700 ring-sage-100",
  dark: "bg-ink text-ivory ring-ink",
};

export function Badge({ tone = "neutral", children, className, dot }: { tone?: BadgeTone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}
