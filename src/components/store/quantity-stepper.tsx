"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = "md",
  label = "Quantity",
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  label?: string;
  disabled?: boolean;
}) {
  const btn = cn(
    "inline-flex items-center justify-center rounded-full text-ink transition-colors hover:bg-cream hover:text-brand disabled:pointer-events-none disabled:opacity-35",
    size === "sm" ? "h-9 w-9" : "h-11 w-11",
  );
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center rounded-full border border-line bg-paper", size === "sm" ? "h-10 px-0.5" : "h-12 px-0.5")}
    >
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={disabled || value <= min} aria-label="Decrease quantity">
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, Math.floor(n))));
        }}
        className={cn(
          "w-9 appearance-none bg-transparent text-center font-semibold text-ink tabular focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          size === "sm" ? "text-sm" : "text-[15px]",
        )}
        style={{ MozAppearance: "textfield" }}
      />
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={disabled || value >= max} aria-label="Increase quantity">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
