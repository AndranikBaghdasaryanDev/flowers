import { ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { categoryInputSchema } from "@/lib/validation";
import { createCategory, listAdminCategories } from "@/lib/services/admin-catalog";

export const GET = route(async (req) => {
  await requirePermission("categories:manage");
  return ok(await listAdminCategories(req.nextUrl.searchParams.get("q") ?? undefined));
});

export const POST = route(async (req) => {
  const user = await requirePermission("categories:manage");
  const input = await readJson(req, categoryInputSchema);
  return ok({ id: await createCategory(input, user) }, { status: 201 });
});
