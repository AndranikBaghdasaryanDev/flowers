"use client";

import { useSyncedState } from "@/lib/client/use-synced-state";

import { useQueryUpdater } from "@/components/admin/query-controls";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/translate";
import type { Messages } from "@/i18n/messages";

const RANGES: { value: string; label: MessageKey<Messages> }[] = [
  { value: "today", label: "admin.common.range.today" },
  { value: "yesterday", label: "admin.common.range.yesterday" },
  { value: "7d", label: "admin.common.range.last7" },
  { value: "30d", label: "admin.common.range.last30" },
  { value: "this_month", label: "admin.common.range.thisMonth" },
  { value: "last_month", label: "admin.common.range.previousMonth" },
  { value: "custom", label: "admin.common.range.custom" },
];

export function RangeTabs({ active, from, to }: { active: string; from: string; to: string }) {
  const t = useT();
  const { update, pending } = useQueryUpdater();
  const [f, setF] = useSyncedState(from);
  const [toValue, setTo] = useSyncedState(to);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1 rounded-full border border-line bg-paper p-1" role="group" aria-label={t("admin.analytics.period")}>
        {RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            aria-pressed={active === r.value}
            onClick={() => update(r.value === "custom" ? { range: "custom", from: f, to: toValue } : { range: r.value === "7d" ? null : r.value, from: null, to: null })}
            className={cn("rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors", active === r.value ? "bg-brand text-white" : "text-ink-soft hover:text-brand")}
          >
            {t(r.label)}
          </button>
        ))}
      </div>
      {active === "custom" && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ range: "custom", from: f, to: toValue });
          }}
        >
          <input type="date" value={f} onChange={(e) => setF(e.target.value)} aria-label={t("admin.common.range.from")} className="h-10 rounded-full border border-line bg-paper px-3 text-[13px]" />
          <span className="text-ink-muted">–</span>
          <input type="date" value={toValue} onChange={(e) => setTo(e.target.value)} aria-label={t("admin.common.range.to")} className="h-10 rounded-full border border-line bg-paper px-3 text-[13px]" />
          <button type="submit" className="h-10 rounded-full bg-ink px-4 text-[13px] font-semibold text-ivory hover:bg-brand">
            {t("admin.common.apply")}
          </button>
        </form>
      )}
      {pending && <Spinner className="h-4 w-4 text-brand" label={t("admin.common.updating")} />}
    </div>
  );
}
