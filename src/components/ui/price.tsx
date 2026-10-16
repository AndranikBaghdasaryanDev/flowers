import { formatMoney, type CurrencyCode } from "@/lib/domain/money";
import { cn } from "@/lib/cn";

export function Price({
  amount,
  compareAt,
  currency,
  className,
  size = "md",
}: {
  amount: number;
  compareAt?: number | null;
  currency: CurrencyCode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const discounted = compareAt !== null && compareAt !== undefined && compareAt > amount;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 tabular", className)}>
      <span className={cn("font-semibold text-ink", size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-[15px]", discounted && "text-brand")}>
        {discounted && <span className="sr-only">Sale price </span>}
        {formatMoney(amount, currency)}
      </span>
      {discounted && (
        <span className={cn("text-ink-muted line-through", size === "lg" ? "text-base" : "text-[13px]")}>
          <span className="sr-only">Previous price </span>
          {formatMoney(compareAt, currency)}
        </span>
      )}
    </span>
  );
}
