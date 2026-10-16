import { ProductCard } from "@/components/store/product-card";
import { Reveal } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import type { ProductCardDTO } from "@/lib/types";

export function ProductGrid({ products, className, priorityCount = 0, columns = 4 }: { products: ProductCardDTO[]; className?: string; priorityCount?: number; columns?: 3 | 4 }) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 md:grid-cols-3",
        columns === 4 ? "xl:grid-cols-4" : "",
        className,
      )}
    >
      {products.map((p, i) => (
        <li key={p.id}>
          <Reveal delay={Math.min(i % 4, 3) * 70}>
            <ProductCard product={p} priority={i < priorityCount} />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8, columns = 4 }: { count?: number; columns?: 3 | 4 }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 md:grid-cols-3", columns === 4 && "xl:grid-cols-4")} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[4/5] w-full rounded-[var(--radius-card)]" />
          <Skeleton className="mt-4 h-3 w-1/3" />
          <Skeleton className="mt-2 h-5 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}
