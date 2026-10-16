"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Table2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Lightweight, dependency-free charts for the admin analytics.
 * Single-series (one brand hue), recessive grid, rounded data-ends, hover tooltip,
 * and an always-available table view so identity/values never rely on colour alone.
 */

export type SeriesPoint = { key: string; label: string; value: number; href?: string; sub?: string };

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(max));
  const f = max / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

export function ColumnChart({
  title,
  points,
  format,
  height = 220,
  integer = false,
  emptyText = "No data for this period.",
}: {
  title: string;
  points: SeriesPoint[];
  format: (v: number) => string;
  height?: number;
  /** Counts: keep axis ticks on whole numbers. */
  integer?: boolean;
  emptyText?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const titleId = useId();
  const total = points.reduce((n, p) => n + p.value, 0);
  const rawMax = niceMax(Math.max(...points.map((p) => p.value), 0));
  const max = integer ? Math.max(4, Math.ceil(rawMax / 4) * 4) : rawMax;
  const W = 720;
  const H = height;
  const padL = 56;
  const padB = 28;
  const padT = 12;
  const plotW = W - padL - 8;
  const plotH = H - padB - padT;
  const n = Math.max(points.length, 1);
  const slot = plotW / n;
  const barW = Math.max(3, Math.min(36, slot - 2));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.ceil(n / 10);

  return (
    <figure className="rounded-2xl border border-line bg-paper p-5" aria-labelledby={titleId}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <figcaption id={titleId} className="text-[15px] font-semibold text-ink">
          {title}
        </figcaption>
        <button
          type="button"
          onClick={() => setAsTable((t) => !t)}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold text-ink-muted hover:bg-cream hover:text-ink"
          aria-pressed={asTable}
        >
          {asTable ? <BarChart3 className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />} {asTable ? "Chart" : "Table"}
        </button>
      </div>
      {total === 0 ? (
        <p className="flex h-40 items-center justify-center rounded-xl bg-cream/50 text-sm text-ink-muted">{emptyText}</p>
      ) : asTable ? (
        <div className="max-h-[300px] overflow-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="text-ink-muted">
                <th className="py-1.5 font-semibold">Day</th>
                <th className="py-1.5 text-right font-semibold">Value</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.key} className="border-t border-line">
                  <td className="py-1.5">{p.href ? <Link href={p.href} className="text-brand hover:underline">{p.label}</Link> : p.label}</td>
                  <td className="py-1.5 text-right tabular">{format(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title}. Use the Table button for exact values.`} onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => {
              const y = padT + plotH - (t / max) * plotH;
              return (
                <g key={t}>
                  <line x1={padL} x2={W - 8} y1={y} y2={y} stroke="var(--color-line)" strokeWidth={1} />
                  <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--color-ink-muted)">
                    {format(t)}
                  </text>
                </g>
              );
            })}
            {points.map((p, i) => {
              const h = (p.value / max) * plotH;
              const x = padL + i * slot + (slot - barW) / 2;
              const y = padT + plotH - h;
              const r = Math.min(4, barW / 2, h);
              return (
                <g key={p.key} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
                  {/* generous hit target */}
                  <rect x={padL + i * slot} y={padT} width={slot} height={plotH} fill="transparent" />
                  {h > 0 && (
                    <path
                      d={`M${x},${padT + plotH} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${padT + plotH} Z`}
                      fill="var(--color-brand)"
                      opacity={hover === null || hover === i ? 1 : 0.45}
                      className="transition-opacity"
                    />
                  )}
                  {(i % labelEvery === 0 || i === n - 1) && (
                    <text x={padL + i * slot + slot / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-ink-muted)">
                      {p.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {hover !== null && points[hover] && (
            <div
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-line bg-paper px-3 py-2 text-[12.5px] shadow-lift"
              style={{ left: `${((padL + hover * slot + slot / 2) / W) * 100}%` }}
              role="status"
            >
              <p className="font-semibold text-ink">{points[hover].sub ?? points[hover].label}</p>
              <p className="tabular text-ink-soft">{format(points[hover].value)}</p>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

/** Horizontal ranked bars rendered in HTML (readable labels, values in text ink). */
export function BarList({
  title,
  items,
  format,
  secondary,
  emptyText = "No data for this period.",
}: {
  title: string;
  items: { key: string; label: string; value: number; secondary?: number; href?: string }[];
  format: (v: number) => string;
  secondary?: (v: number) => string;
  emptyText?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 0);
  return (
    <section className="rounded-2xl border border-line bg-paper p-5" aria-label={title}>
      <h3 className="mb-4 font-sans text-[15px] font-semibold tracking-normal text-ink">{title}</h3>
      {items.length === 0 || max === 0 ? (
        <p className="rounded-xl bg-cream/50 py-8 text-center text-sm text-ink-muted">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.key}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate font-medium text-ink">{i.href ? <Link href={i.href} className="hover:text-brand">{i.label}</Link> : i.label}</span>
                <span className="shrink-0 tabular text-ink-soft">
                  {format(i.value)}
                  {secondary && i.secondary !== undefined && <span className="ml-2 text-ink-muted">{secondary(i.secondary)}</span>}
                </span>
              </div>
              <div className="h-2 rounded-full bg-cream" aria-hidden="true">
                <div className={cn("h-2 rounded-full bg-brand")} style={{ width: `${Math.max(2, (i.value / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
