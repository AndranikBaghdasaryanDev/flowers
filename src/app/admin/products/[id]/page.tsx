import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { getAdminProduct, listAdminCategories } from "@/lib/services/admin-catalog";
import { loadSettings } from "@/lib/services/settings";
import { AdminPageHeader, NoAccess } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { CURRENCIES } from "@/lib/domain/money";
import { getAdminI18n } from "@/i18n/server";
import { ProductForm } from "../product-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("admin.products.editTitle") };
}
export const instant = false;

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  await connection();
  const { id } = await params;
  const { t } = await getAdminI18n();
  const { allowed } = await requireStaffPage(`/admin/products/${id}`, "products:manage");
  if (!allowed) return <NoAccess what={t("admin.nav.products")} />;
  const [product, cats, settings] = await Promise.all([getAdminProduct(id), listAdminCategories(), loadSettings()]);
  if (!product) notFound();
  const { id: _id, isArchived, isSample, ...rest } = product;
  return (
    <>
      <AdminPageHeader
        title={product.name}
        crumbs={[{ label: t("admin.products.title"), href: "/admin/products" }, { label: product.name }]}
        description={isSample ? <Badge tone="info">{t("admin.products.sampleNotice")}</Badge> : undefined}
      />
      <ProductForm
        key={_id}
        productId={_id}
        isArchived={isArchived}
        initial={{
          ...rest,
          compareAtPrice: rest.compareAtPrice ?? "",
          stockQuantity: rest.stockQuantity ?? "",
          maxPerOrder: rest.maxPerOrder ?? "",
          i18n: rest.i18n ?? {},
        }}
        collections={cats.filter((c) => c.kind === "collection").map((c) => ({ id: c.id, name: c.name }))}
        occasions={cats.filter((c) => c.kind === "occasion").map((c) => ({ id: c.id, name: c.name }))}
        currencySymbol={CURRENCIES[settings.currency].symbol}
      />
    </>
  );
}
