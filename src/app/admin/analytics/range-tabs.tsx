"use client";

import { useSyncedState } from "@/lib/client/use-synced-state";

import { useQueryUpdater } from "@/components/admin/query-controls";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";

const RANGES = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Previous month" },
  { value: "custom", label: "Custom" },
];

export function RangeTabs({ active, from, to }: { active: string; from: string; to: string }) {
  const { update, pending } = useQueryUpdater();
  const [f, setF] = useSyncedState(from);
  const [t, setT] = useSyncedState(to);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1 rounded-full border border-line bg-paper p-1" role="group" aria-label="Reporting period">
        {RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            aria-pressed={active === r.value}
            onClick={() => update(r.value === "custom" ? { range: "custom", from: f, to: t } : { range: r.value === "7d" ? null : r.value, from: null, to: null })}
            className={cn("rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors", active === r.value ? "bg-brand text-white" : "text-ink-soft hover:text-brand")}
          >
            {r.label}
          </button>
        ))}
      </div>
      {active === "custom" && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ range: "custom", from: f, to: t });
          }}
        >
          <input type="date" value={f} onChange={(e) => setF(e.target.value)} aria-label="From" className="h-10 rounded-full border border-line bg-paper px-3 text-[13px]" />
          <span className="text-ink-muted">–</span>
          <input type="date" value={t} onChange={(e) => setT(e.target.value)} aria-label="To" className="h-10 rounded-full border border-line bg-paper px-3 text-[13px]" />
          <button type="submit" className="h-10 rounded-full bg-ink px-4 text-[13px] font-semibold text-ivory hover:bg-brand">
            Apply
          </button>
        </form>
      )}
      {pending && <Spinner className="h-4 w-4 text-brand" label="Updating" />}
    </div>
  );
}
