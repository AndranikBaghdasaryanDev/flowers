"use client";

import type { ComponentProps, ReactNode } from "react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/cn";

export const inputClasses =
  "block w-full rounded-xl border border-line bg-paper px-4 text-[15px] text-ink placeholder:text-ink-muted/70 shadow-[inset_0_1px_1px_rgb(43_30_35/0.03)] transition-colors duration-150 hover:border-line-strong focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:bg-cream aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/10";

type FieldProps = {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: ReactNode;
};

/** Label + control + hint/error, wired for screen readers via ids `${id}-hint` / `${id}-error`. */
export function Field({ id, label, error, hint, required, optional, className, children }: FieldProps) {
  const t = useT();
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-[13px] font-semibold text-ink">
        <span>
          {label}
          {required && <span className="ml-0.5 text-brand" aria-hidden="true">*</span>}
        </span>
        {optional && <span className="text-xs font-normal text-ink-muted">{t("common.optional")}</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: ReactNode) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

type InputProps = ComponentProps<"input"> & { invalid?: boolean };

export function Input({ className, invalid, ...props }: InputProps) {
  return <input aria-invalid={invalid || undefined} className={cn(inputClasses, "h-12", className)} {...props} />;
}

type TextareaProps = ComponentProps<"textarea"> & { invalid?: boolean };

export function Textarea({ className, invalid, rows = 4, ...props }: TextareaProps) {
  return <textarea rows={rows} aria-invalid={invalid || undefined} className={cn(inputClasses, "py-3 leading-relaxed", className)} {...props} />;
}

type SelectProps = ComponentProps<"select"> & { invalid?: boolean };

export function Select({ className, invalid, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select aria-invalid={invalid || undefined} className={cn(inputClasses, "h-12 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <svg className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

type CheckboxProps = Omit<ComponentProps<"input">, "type"> & { label: ReactNode; description?: ReactNode };

export function Checkbox({ label, description, className, id, ...props }: CheckboxProps) {
  return (
    <label htmlFor={id} className={cn("flex cursor-pointer items-start gap-3 text-sm text-ink", className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md border-line-strong accent-[#781241]"
        {...props}
      />
      <span>
        <span className="font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-ink-muted">{description}</span>}
      </span>
    </label>
  );
}

/** Large selectable card used for delivery and payment choices. */
export function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  aside,
  icon,
  disabled,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-start gap-4 rounded-2xl border bg-paper p-4 transition-all duration-200 sm:p-5",
        checked ? "border-brand shadow-[0_0_0_3px_rgb(120_18_65/0.08)]" : "border-line hover:border-line-strong",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-brand/20",
          checked ? "border-brand" : "border-line-strong",
        )}
      >
        <span className={cn("h-2.5 w-2.5 rounded-full bg-brand transition-transform duration-200", checked ? "scale-100" : "scale-0")} />
      </span>
      {icon && <span className="mt-0.5 text-brand">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="font-semibold text-ink">{title}</span>
          {aside && <span className="text-sm font-semibold text-ink tabular">{aside}</span>}
        </span>
        {description && <span className="mt-1 block text-[13px] leading-relaxed text-ink-muted">{description}</span>}
      </span>
    </label>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl border border-danger/20 bg-danger-50 px-4 py-3 text-sm text-danger">
      {message}
    </div>
  );
}
