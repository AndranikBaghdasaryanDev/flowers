import { cn } from "@/lib/cn";

/** Elegant botanical placeholder shown when a product image is missing or fails to load. */
export function ImageFallback({ label, className }: { label?: string; className?: string }) {
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      className={cn("absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cream via-brand-50 to-sand", className)}
    >
      <svg viewBox="0 0 120 160" className="h-2/5 w-auto text-brand/25" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <path d="M60 150V70" />
        <path d="M60 110c-14-2-24-12-26-26 14 2 24 12 26 26Z" />
        <path d="M60 96c14-2 24-12 26-26-14 2-24 12-26 26Z" />
        <circle cx="60" cy="44" r="14" />
        <path d="M60 30c-6-10-18-12-24-6 0 10 10 18 24 20M60 30c6-10 18-12 24-6 0 10-10 18-24 20M46 44c-10 4-14 16-8 22 10 0 18-8 22-20M74 44c10 4 14 16 8 22-10 0-18-8-22-20" />
      </svg>
    </div>
  );
}
