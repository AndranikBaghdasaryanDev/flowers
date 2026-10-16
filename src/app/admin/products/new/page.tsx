import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { listAdminCategories } from "@/lib/services/admin-catalog";
import { loadSettings } from "@/lib/services/settings";
import { AdminPageHeader, NoAccess } from "@/components/admin/ui";
import { CURRENCIES } from "@/lib/domain/money";
import { EMPTY_PRODUCT, ProductForm } from "../product-form";

export const metadata = { title: "New product" };
export const instant = false;

export default async function NewProductPage() {
  await connection();
  const { allowed } = await requireStaffPage("/admin/products/new", "products:manage");
  if (!allowed) return <NoAccess what="products" />;
  const [cats, settings] = await Promise.all([listAdminCategories(), loadSettings()]);
  return (
    <>
      <AdminPageHeader title="New product" crumbs={[{ label: "Products", href: "/admin/products" }, { label: "New" }]} />
      <ProductForm
        initial={EMPTY_PRODUCT}
        collections={cats.filter((c) => c.kind === "collection").map((c) => ({ id: c.id, name: c.name }))}
        occasions={cats.filter((c) => c.kind === "occasion").map((c) => ({ id: c.id, name: c.name }))}
        currencySymbol={CURRENCIES[settings.currency].symbol}
      />
    </>
  );
}
