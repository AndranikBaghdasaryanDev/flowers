"use client";

import { useSyncedState } from "@/lib/client/use-synced-state";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";

export type FilterOption = { slug: string; name: string; count: number };

type Props = {
  collections: FilterOption[];
  occasions: FilterOption[];
  hasPopularity: boolean;
  priceBounds: { min: number; max: number } | null;
  currencySymbol: string;
  lockedCategory?: string;
  total: number;
};

const SORTS = [
  { value: "relevance", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "popular", label: "Most popular" },
];

/** Filter + sort controls. All state lives in the URL so results are shareable and server-rendered. */
export function ShopControls(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  const update = (changes: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete("page");
    const qs = sp.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const sort = params.get("sort") ?? "relevance";
  const sorts = SORTS.filter((s) => s.value !== "popular" || props.hasPopularity);

  const chips: { key: string; label: string }[] = [];
  const q = params.get("q");
  if (q) chips.push({ key: "q", label: `“${q}”` });
  const cat = params.get("category");
  if (cat && !props.lockedCategory) chips.push({ key: "category", label: props.collections.find((c) => c.slug === cat)?.name ?? props.occasions.find((c) => c.slug === cat)?.name ?? cat });
  const occ = params.get("occasion");
  if (occ) chips.push({ key: "occasion", label: props.occasions.find((c) => c.slug === occ)?.name ?? occ });
  if (params.get("min") || params.get("max")) chips.push({ key: "price", label: `${params.get("min") ?? "0"} – ${params.get("max") ?? "∞"} ${props.currencySymbol}` });
  if (params.get("available")) chips.push({ key: "available", label: "Available now" });

  const removeChip = (key: string) => (key === "price" ? update({ min: null, max: null }) : update({ [key]: null }));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold text-ink hover:border-brand hover:text-brand lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
            {chips.length > 0 && <span className="rounded-full bg-brand px-1.5 text-[11px] text-white">{chips.length}</span>}
          </button>
          <p className="text-sm text-ink-muted" aria-live="polite">
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="h-4 w-4 text-brand" /> Updating…
              </span>
            ) : (
              <>
                {props.total} {props.total === 1 ? "piece" : "pieces"}
              </>
            )}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="hidden sm:inline">Sort by</span>
          <select
            value={sort}
            onChange={(e) => update({ sort: e.target.value === "relevance" ? null : e.target.value })}
            className="h-11 rounded-full border border-line-strong bg-paper pl-4 pr-9 text-sm font-semibold text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
            aria-label="Sort products"
          >
            {sorts.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => removeChip(c.key)}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1.5 pl-3 pr-2 text-[13px] font-semibold text-brand hover:bg-brand-100"
              aria-label={`Remove filter ${c.label}`}
            >
              {c.label} <X className="h-3.5 w-3.5" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => startTransition(() => router.push(pathname, { scroll: false }))}
            className="px-2 text-[13px] font-semibold text-ink-muted underline-offset-2 hover:text-brand hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      <Modal open={mobileOpen} onClose={() => setMobileOpen(false)} title="Filters" side="left" footer={<Button className="w-full" onClick={() => setMobileOpen(false)}>Show {props.total} results</Button>}>
        <FilterPanel {...props} update={update} />
      </Modal>
    </>
  );
}

export function ShopSidebar(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const update = (changes: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete("page");
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  return <FilterPanel {...props} update={update} />;
}

function FilterPanel({ collections, occasions, priceBounds, currencySymbol, lockedCategory, update }: Props & { update: (c: Record<string, string | null>) => void }) {
  const params = useSearchParams();
  const [min, setMin] = useSyncedState(params.get("min") ?? "");
  const [max, setMax] = useSyncedState(params.get("max") ?? "");
  const activeCat = params.get("category");
  const activeOcc = params.get("occasion");

  const listBtn = (active: boolean) =>
    cn(
      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[14.5px] transition-colors",
      active ? "bg-brand-50 font-semibold text-brand" : "text-ink-soft hover:bg-cream hover:text-ink",
    );

  return (
    <div className="space-y-8">
      {!lockedCategory && collections.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-muted">Collections</legend>
          <ul className="-mx-3 space-y-0.5">
            <li>
              <button type="button" className={listBtn(!activeCat)} onClick={() => update({ category: null })} aria-pressed={!activeCat}>
                All flowers
              </button>
            </li>
            {collections.map((c) => (
              <li key={c.slug}>
                <button type="button" className={listBtn(activeCat === c.slug)} onClick={() => update({ category: c.slug })} aria-pressed={activeCat === c.slug}>
                  <span>{c.name}</span>
                  <span className="text-xs text-ink-muted tabular">{c.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {occasions.length > 0 && lockedCategory !== "occasion" && (
        <fieldset>
          <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-muted">Occasion</legend>
          <div className="flex flex-wrap gap-2">
            {occasions.map((o) => {
              const active = activeOcc === o.slug;
              return (
                <button
                  key={o.slug}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ occasion: active ? null : o.slug })}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                    active ? "border-brand bg-brand text-white" : "border-line-strong text-ink-soft hover:border-brand hover:text-brand",
                  )}
                >
                  {o.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-muted">Price ({currencySymbol})</legend>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const lo = min ? String(Math.max(0, Number(min))) : null;
            const hi = max ? String(Math.max(0, Number(max))) : null;
            update(lo && hi && Number(lo) > Number(hi) ? { min: hi, max: lo } : { min: lo, max: hi });
          }}
        >
          <label className="flex-1">
            <span className="sr-only">Minimum price</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={priceBounds ? String(Math.floor(priceBounds.min)) : "Min"}
              value={min}
              onChange={(e) => setMin(e.target.value)}
              className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
            />
          </label>
          <span className="pb-3 text-ink-muted">–</span>
          <label className="flex-1">
            <span className="sr-only">Maximum price</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={priceBounds ? String(Math.ceil(priceBounds.max)) : "Max"}
              value={max}
              onChange={(e) => setMax(e.target.value)}
              className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
            />
          </label>
          <button type="submit" className="h-11 rounded-xl bg-ink px-4 text-sm font-semibold text-ivory hover:bg-brand">
            Go
          </button>
        </form>
      </fieldset>

      <fieldset>
        <legend className="sr-only">Availability</legend>
        <label className="flex cursor-pointer items-center gap-3 text-[14.5px] text-ink">
          <input
            type="checkbox"
            checked={Boolean(params.get("available"))}
            onChange={(e) => update({ available: e.target.checked ? "1" : null })}
            className="h-5 w-5 rounded accent-[#781241]"
          />
          Available now only
        </label>
      </fieldset>
    </div>
  );
}
