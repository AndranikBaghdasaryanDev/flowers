import { assertObjectId, ok, requirePermission, route } from "@/lib/api/handler";
import { restoreProduct } from "@/lib/services/admin-catalog";

export const POST = route<{ id: string }>(async (_req, ctx) => {
  const user = await requirePermission("products:manage");
  const { id } = await ctx.params;
  assertObjectId(id, "product");
  await restoreProduct(id, user);
  return ok({ restored: true });
});
