"use client";

import Image from "next/image";
import { Link } from "@/i18n/client";
import { useLocalizedRouter, useT } from "@/i18n/client";
import { useEffect, useId, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Price } from "@/components/ui/price";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/client/api";
import type { ProductCardDTO } from "@/lib/types";

/** Search overlay with live results from the catalogue API. */
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useLocalizedRouter();
  const t = useT();
  const inputId = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProductCardDTO[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  // Results only apply to a meaningful query; shorter input shows the hint.
  const visibleResults = q.trim().length >= 2 ? results : null;

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const t = window.setTimeout(() => {
      setLoading(true);
      api<{ items: ProductCardDTO[]; total: number }>(`/api/products?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((r) => {
          setResults(r.items.slice(0, 6));
          setTotal(r.total);
        })
        .catch(() => undefined)
        .finally(() => !controller.signal.aborted && setLoading(false));
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(t);
    };
  }, [q]);

  const showAll = () => {
    const term = q.trim();
    if (!term) return;
    onClose();
    router.push(`/shop?q=${encodeURIComponent(term)}`);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    showAll();
  };

  return (
    <Modal open={open} onClose={onClose} title={t("search.title")} size="lg">
      <form onSubmit={submit} role="search">
        <label htmlFor={inputId} className="sr-only">
          {t("search.label")}
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
          <input
            id={inputId}
            autoFocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder")}
            className="h-14 w-full rounded-2xl border border-line bg-paper pl-12 pr-12 text-[17px] text-ink placeholder:text-ink-muted/70 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
            maxLength={80}
          />
          {loading && q.trim().length >= 2 && <Spinner className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand" />}
        </div>
      </form>
      <div className="mt-5" aria-live="polite">
        {visibleResults === null ? (
          <p className="text-sm text-ink-muted">{t("search.hint")}</p>
        ) : visibleResults.length === 0 ? (
          <p className="text-sm text-ink-muted">{t("search.noResults", { query: q.trim() })}</p>
        ) : (
          <>
            <ul className="divide-y divide-line">
              {visibleResults.map((p) => (
                <li key={p.id}>
                  <Link href={`/products/${p.slug}`} onClick={onClose} className="flex items-center gap-4 rounded-xl py-3 transition-colors hover:bg-cream/60">
                    <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-cream">
                      {p.image && <Image src={p.image.src} alt="" fill sizes="64px" className="object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{p.name}</span>
                      <span className="block truncate text-[13px] text-ink-muted">{p.category?.name}</span>
                    </span>
                    <Price amount={p.price} compareAt={p.compareAtPrice} currency={p.currency} size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
            {total > visibleResults.length && (
              <button type="button" onClick={showAll} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
                {t("search.seeAll", { count: total })} <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
