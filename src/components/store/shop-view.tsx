import { Search } from "lucide-react";
import { ProductGrid } from "@/components/store/product-grid";
import { ShopControls, ShopSidebar, type FilterOption } from "@/components/store/shop-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { listPublicCategories, listShopProducts, type ShopQuery, type ShopSort } from "@/lib/services/catalog";
import { getSettings } from "@/lib/services/settings";
import { CURRENCIES, toMajor } from "@/lib/domain/money";

const SORT_VALUES: ShopSort[] = ["relevance", "newest", "price_asc", "price_desc", "popular"];

export type RawSearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseShopParams(sp: RawSearchParams): ShopQuery {
  const num = (v: string | undefined) => {
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const sort = one(sp.sort) as ShopSort | undefined;
  const page = Number(one(sp.page) ?? 1);
  return {
    q: one(sp.q)?.slice(0, 80) || undefined,
    category: one(sp.category)?.slice(0, 80) || undefined,
    occasion: one(sp.occasion)?.slice(0, 80) || undefined,
    min: num(one(sp.min)),
    max: num(one(sp.max)),
    available: Boolean(one(sp.available)),
    sort: sort && SORT_VALUES.includes(sort) ? sort : undefined,
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 1000) : 1,
  };
}

/** Product listing with filters. Used by /shop and category/occasion landing pages. */
export async function ShopView({
  searchParams,
  basePath,
  lockedCategory,
  lockedKind,
}: {
  searchParams: RawSearchParams;
  basePath: string;
  lockedCategory?: string;
  lockedKind?: "collection" | "occasion";
}) {
  const query = parseShopParams(searchParams);
  if (lockedCategory) query.category = lockedCategory;
  const [result, categories, settings] = await Promise.all([listShopProducts(query), listPublicCategories(), getSettings()]);
  const toOption = (kind: "collection" | "occasion"): FilterOption[] =>
    categories.filter((c) => c.kind === kind && c.productCount > 0).map((c) => ({ slug: c.slug, name: c.name, count: c.productCount }));

  const linkParams: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(searchParams)) linkParams[k] = one(v);

  const controls = {
    collections: toOption("collection"),
    occasions: toOption("occasion"),
    hasPopularity: result.hasPopularity,
    priceBounds: result.priceBounds
      ? { min: toMajor(result.priceBounds.min, settings.currency), max: toMajor(result.priceBounds.max, settings.currency) }
      : null,
    currencySymbol: CURRENCIES[settings.currency].symbol,
    lockedCategory: lockedCategory ? (lockedKind ?? "collection") : undefined,
    total: result.total,
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-12">
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-28">
          <ShopSidebar {...controls} />
        </div>
      </aside>
      <div className="min-w-0">
        <ShopControls {...controls} />
        {result.items.length === 0 ? (
          <EmptyState
            className="mt-8"
            icon={<Search className="h-6 w-6" />}
            title={query.q ? `Nothing found for “${query.q}”` : "No flowers match these filters"}
            description="Try removing a filter, widening the price range, or browsing all flowers."
            action={
              <LinkButton href={lockedCategory ? basePath : "/shop"} variant="outline">
                Clear filters
              </LinkButton>
            }
          />
        ) : (
          <>
            <ProductGrid products={result.items} className="mt-8" columns={3} priorityCount={3} />
            <Pagination className="mt-14" page={result.page} pageCount={result.pageCount} basePath={basePath} params={linkParams} />
          </>
        )}
      </div>
    </div>
  );
}
