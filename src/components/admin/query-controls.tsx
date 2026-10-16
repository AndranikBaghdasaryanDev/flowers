"use client";

import { useSyncedState } from "@/lib/client/use-synced-state";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";

/** Updates URL query params (resetting pagination) for server-rendered admin lists. */
export function useQueryUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const update = (changes: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete("page");
    const qs = sp.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  return { update, params, pending };
}

export function SearchBox({ placeholder, param = "q" }: { placeholder: string; param?: string }) {
  const { update, params, pending } = useQueryUpdater();
  const [value, setValue] = useSyncedState(params.get(param) ?? "");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        update({ [param]: value.trim() || null });
      }}
      className="relative w-full sm:max-w-xs"
    >
      <label className="sr-only" htmlFor={`search-${param}`}>
        {placeholder}
      </label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input
        id={`search-${param}`}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-full border border-line bg-paper pl-10 pr-10 text-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
      />
      {pending && <Spinner className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand" />}
    </form>
  );
}

export function SelectFilter({ param, label, options }: { param: string; label: string; options: { value: string; label: string }[] }) {
  const { update, params } = useQueryUpdater();
  return (
    <label className="flex items-center gap-2 text-[13px] text-ink-muted">
      <span className="sr-only sm:not-sr-only">{label}</span>
      <select
        value={params.get(param) ?? ""}
        onChange={(e) => update({ [param]: e.target.value || null })}
        className="h-10 rounded-full border border-line bg-paper px-3.5 pr-8 text-[13px] font-semibold text-ink focus:border-brand focus:outline-none"
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const RANGES = [
  { value: "", label: "All time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom" },
];

export function DateRangeFilter({ withDateField }: { withDateField?: boolean }) {
  const { update, params } = useQueryUpdater();
  const range = params.get("range") ?? "";
  const [from, setFrom] = useSyncedState(params.get("from") ?? "");
  const [to, setTo] = useSyncedState(params.get("to") ?? "");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1 rounded-full border border-line bg-paper p-1" role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            aria-pressed={range === r.value}
            onClick={() => update({ range: r.value || null, ...(r.value !== "custom" ? { from: null, to: null } : {}) })}
            className={cn("rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors", range === r.value ? "bg-brand text-white" : "text-ink-soft hover:text-brand")}
          >
            {r.label}
          </button>
        ))}
      </div>
      {range === "custom" && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ from: from || null, to: to || null });
          }}
        >
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" className="h-10 rounded-full border border-line bg-paper px-3 text-[13px]" />
          <span className="text-ink-muted">–</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" className="h-10 rounded-full border border-line bg-paper px-3 text-[13px]" />
          <button type="submit" className="h-10 rounded-full bg-ink px-4 text-[13px] font-semibold text-ivory hover:bg-brand">
            Apply
          </button>
        </form>
      )}
      {withDateField && range && (
        <select
          value={params.get("dateField") ?? "created"}
          onChange={(e) => update({ dateField: e.target.value === "created" ? null : e.target.value })}
          aria-label="Date applies to"
          className="h-10 rounded-full border border-line bg-paper px-3 text-[12.5px] font-semibold"
        >
          <option value="created">by order date</option>
          <option value="delivery">by delivery date</option>
        </select>
      )}
    </div>
  );
}
