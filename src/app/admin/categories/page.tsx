import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { listAdminCategories } from "@/lib/services/admin-catalog";
import { AdminPageHeader, NoAccess } from "@/components/admin/ui";
import { SearchBox } from "@/components/admin/query-controls";
import { CategoryManager } from "./category-manager";
import { getAdminI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { t } = await getAdminI18n();
  return { title: t("admin.nav.categories") };
}
export const instant = false;

export default async function AdminCategoriesPage({ searchParams }: PageProps<"/admin/categories">) {
  await connection();
  const { allowed } = await requireStaffPage("/admin/categories", "categories:manage");
  const { t } = await getAdminI18n();
  if (!allowed) return <NoAccess what={t("admin.nav.categories")} />;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : undefined;
  const categories = await listAdminCategories(q);
  return (
    <>
      <AdminPageHeader title={t("admin.nav.categories")} description={t("admin.categories.description")} actions={<SearchBox placeholder={t("admin.categories.search")} />} />
      <CategoryManager categories={categories} />
    </>
  );
}
