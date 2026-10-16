import { assertObjectId, ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { categoryInputSchema, objectIdSchema } from "@/lib/validation";
import { deleteCategory, updateCategory } from "@/lib/services/admin-catalog";

export const PUT = route<{ id: string }>(async (req, ctx) => {
  const user = await requirePermission("categories:manage");
  const { id } = await ctx.params;
  assertObjectId(id, "category");
  const input = await readJson(req, categoryInputSchema);
  await updateCategory(id, input, user);
  return ok({ id });
});

/** DELETE /api/admin/categories/:id?reassignTo=<categoryId> — never deletes products. */
export const DELETE = route<{ id: string }>(async (req, ctx) => {
  const user = await requirePermission("categories:manage");
  const { id } = await ctx.params;
  assertObjectId(id, "category");
  const raw = req.nextUrl.searchParams.get("reassignTo");
  const reassignTo = raw ? objectIdSchema.parse(raw) : null;
  await deleteCategory(id, reassignTo, user);
  return ok({ deleted: true });
});
