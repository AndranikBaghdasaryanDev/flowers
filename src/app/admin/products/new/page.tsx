import type { Metadata } from "next";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { listAdminCategories } from "@/lib/services/admin-catalog";
import { loadSettings } from "@/lib/services/settings";
import { AdminPageHeader, NoAccess } from "@/components/admin/ui";
import { CURRENCIES } from "@/lib/domain/money";
import { getAdminI18n } from "@/i18n/server";
import { EMPTY_PRODUCT, ProductForm } from "../product-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("admin.products.new") };
}
export const instant = false;

export default async function NewProductPage() {
  await connection();
  const { t } = await getAdminI18n();
  const { allowed } = await requireStaffPage("/admin/products/new", "products:manage");
  if (!allowed) return <NoAccess what={t("admin.nav.products")} />;
  const [cats, settings] = await Promise.all([listAdminCategories(), loadSettings()]);
  return (
    <>
      <AdminPageHeader title={t("admin.products.new")} crumbs={[{ label: t("admin.products.title"), href: "/admin/products" }, { label: t("admin.products.newCrumb") }]} />
      <ProductForm
        initial={EMPTY_PRODUCT}
        collections={cats.filter((c) => c.kind === "collection").map((c) => ({ id: c.id, name: c.name }))}
        occasions={cats.filter((c) => c.kind === "occasion").map((c) => ({ id: c.id, name: c.name }))}
        currencySymbol={CURRENCIES[settings.currency].symbol}
      />
    </>
  );
}
