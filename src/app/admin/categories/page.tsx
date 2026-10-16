import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { listAdminCategories } from "@/lib/services/admin-catalog";
import { AdminPageHeader, NoAccess } from "@/components/admin/ui";
import { SearchBox } from "@/components/admin/query-controls";
import { CategoryManager } from "./category-manager";

export const metadata = { title: "Categories" };
export const instant = false;

export default async function AdminCategoriesPage({ searchParams }: PageProps<"/admin/categories">) {
  await connection();
  const { allowed } = await requireStaffPage("/admin/categories", "categories:manage");
  if (!allowed) return <NoAccess what="categories" />;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : undefined;
  const categories = await listAdminCategories(q);
  return (
    <>
      <AdminPageHeader title="Categories" description="Collections organise the catalogue; occasions help customers shop by moment." actions={<SearchBox placeholder="Search categories" />} />
      <CategoryManager categories={categories} />
    </>
  );
}
