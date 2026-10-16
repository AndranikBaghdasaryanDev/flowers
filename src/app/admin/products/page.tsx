import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/client";
import { connection } from "next/server";
import { Plus } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guards";
import { listAdminCategories, listAdminProducts } from "@/lib/services/admin-catalog";
import { loadSettings } from "@/lib/services/settings";
import { AdminPageHeader, FilterLink, MobileCards, NoAccess, Panel, Table, td, th } from "@/components/admin/ui";
import { SearchBox, SelectFilter } from "@/components/admin/query-controls";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { ImageFallback } from "@/components/store/image-fallback";
import { getAdminI18n } from "@/i18n/server";
import { ProductRowActions } from "./product-row-actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("admin.products.title") };
}
export const instant = false;

const STATUS = [
  { value: "", label: "admin.common.all" },
  { value: "active", label: "admin.products.published" },
  { value: "inactive", label: "admin.products.unpublished" },
  { value: "featured", label: "admin.common.featured" },
  { value: "archived", label: "admin.products.archived" },
] as const;

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await connection();
  const { t, f } = await getAdminI18n();
  const { allowed } = await requireStaffPage("/admin/products", "products:manage");
  if (!allowed) return <NoAccess what={t("admin.nav.products")} />;
  const raw = await searchParams;
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") flat[k] = v.slice(0, 80);
  const [result, cats, settings] = await Promise.all([
    listAdminProducts({ q: flat.q, category: flat.category, status: flat.status, availability: flat.availability, page: Number(flat.page) || 1 }),
    listAdminCategories(),
    loadSettings(),
  ]);
  const href = (changes: Record<string, string | null>) => {
    const sp = new URLSearchParams(flat);
    for (const [k, v] of Object.entries(changes)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    const s = sp.toString();
    return s ? `/admin/products?${s}` : "/admin/products";
  };

  const stock = (p: (typeof result.items)[number]) =>
    p.trackInventory ? (
      <Badge tone={(p.stockQuantity ?? 0) === 0 ? "danger" : (p.stockQuantity ?? 0) <= 5 ? "warning" : "neutral"}>{t("admin.products.inStock", { count: p.stockQuantity ?? 0 })}</Badge>
    ) : (
      <span className="text-ink-muted">{t("admin.products.notTracked")}</span>
    );

  return (
    <>
      <AdminPageHeader
        title={flat.availability === "low_stock" ? t("admin.nav.inventory") : t("admin.products.title")}
        description={t("admin.products.count", { count: result.total })}
        actions={
          <LinkButton href="/admin/products/new" size="sm" icon={<Plus className="h-4 w-4" />}>
            {t("admin.products.new")}
          </LinkButton>
        }
      />
      <div className="mb-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {STATUS.map((s) => (
          <FilterLink key={s.value} href={href({ status: s.value || null })} active={(flat.status ?? "") === s.value}>
            {t(s.label)}
          </FilterLink>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <SearchBox placeholder={t("admin.products.searchPlaceholder")} />
        <SelectFilter param="category" label={t("admin.products.category")} options={[{ value: "", label: t("admin.products.allCategories") }, ...cats.filter((c) => c.kind === "collection").map((c) => ({ value: c.id, label: c.name }))]} />
        <SelectFilter
          param="availability"
          label={t("admin.products.stock")}
          options={[
            { value: "", label: t("admin.products.anyAvailability") },
            { value: "available", label: t("admin.products.available") },
            { value: "unavailable", label: t("admin.products.unavailable") },
            { value: "low_stock", label: t("admin.products.lowStock") },
            { value: "out_of_stock", label: t("admin.products.outOfStock") },
          ]}
        />
      </div>

      <Panel padded={false}>
        {result.items.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-ink-muted">{t("admin.products.empty")}</p>
            <LinkButton href="/admin/products/new" variant="soft" size="sm" className="mt-4">
              {t("admin.products.create")}
            </LinkButton>
          </div>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th className={th}>{t("admin.products.product")}</th>
                  <th className={th}>{t("admin.products.category")}</th>
                  <th className={`${th} text-right`}>{t("admin.products.price")}</th>
                  <th className={th}>{t("admin.products.stock")}</th>
                  <th className={th}>{t("admin.common.status")}</th>
                  <th className={`${th} text-right`}>{t("admin.products.sold")}</th>
                  <th className={`${th} text-right`}>{t("admin.common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((p) => (
                  <tr key={p.id} className="hover:bg-cream/50">
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-cream">
                          {p.image ? <Image src={p.image.src} alt="" fill sizes="40px" className="object-cover" /> : <ImageFallback />}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/admin/products/${p.id}`} className="font-semibold text-ink hover:text-brand">
                            {p.name}
                          </Link>
                          <p className="truncate text-xs text-ink-muted">/{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`${td} text-ink-soft`}>{p.categoryName}</td>
                    <td className={`${td} text-right tabular`}>
                      {f.money(p.price, settings.currency)}
                      {p.compareAtPrice && p.compareAtPrice > p.price && <p className="text-xs text-ink-muted line-through">{f.money(p.compareAtPrice, settings.currency)}</p>}
                    </td>
                    <td className={td}>{stock(p)}</td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1">
                        {p.isArchived ? <Badge tone="neutral">{t("admin.products.archived")}</Badge> : p.isActive ? <Badge tone="success">{t("admin.products.published")}</Badge> : <Badge tone="warning">{t("admin.products.unpublished")}</Badge>}
                        {p.availability === "unavailable" && !p.isArchived && <Badge tone="neutral">{t("admin.products.unavailable")}</Badge>}
                        {p.isSample && <Badge tone="info">{t("admin.common.sample")}</Badge>}
                      </div>
                    </td>
                    <td className={`${td} text-right tabular text-ink-soft`}>{f.number(p.unitsSold)}</td>
                    <td className={td}>
                      <ProductRowActions id={p.id} name={p.name} isActive={p.isActive} isFeatured={p.isFeatured} isArchived={p.isArchived} hasImages={Boolean(p.image)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <MobileCards>
              {result.items.map((p) => (
                <li key={p.id} className="flex gap-3 px-4 py-3">
                  <Link href={`/admin/products/${p.id}`} className="relative h-16 w-13 shrink-0 overflow-hidden rounded-lg bg-cream">
                    {p.image ? <Image src={p.image.src} alt="" fill sizes="52px" className="object-cover" /> : <ImageFallback />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/products/${p.id}`} className="font-semibold text-ink">
                      {p.name}
                    </Link>
                    <p className="text-[13px] text-ink-muted">
                      {p.categoryName} · <span className="tabular">{f.money(p.price, settings.currency)}</span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {p.isArchived ? <Badge tone="neutral">{t("admin.products.archived")}</Badge> : p.isActive ? <Badge tone="success">{t("admin.products.published")}</Badge> : <Badge tone="warning">{t("admin.products.unpublished")}</Badge>}
                      {p.trackInventory && stock(p)}
                      {p.isSample && <Badge tone="info">{t("admin.common.sample")}</Badge>}
                    </div>
                    <div className="-ml-2 mt-1">
                      <ProductRowActions id={p.id} name={p.name} isActive={p.isActive} isFeatured={p.isFeatured} isArchived={p.isArchived} hasImages={Boolean(p.image)} />
                    </div>
                  </div>
                </li>
              ))}
            </MobileCards>
          </>
        )}
      </Panel>
      <Pagination className="mt-6" page={result.page} pageCount={result.pageCount} basePath="/admin/products" params={flat} />
    </>
  );
}
