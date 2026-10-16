import { ApiError } from "@/lib/api/errors";
import { assertObjectId, ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { productInputSchema, productPatchSchema } from "@/lib/validation";
import { deleteProduct, getAdminProduct, patchProduct, updateProduct } from "@/lib/services/admin-catalog";

export const GET = route<{ id: string }>(async (_req, ctx) => {
  await requirePermission("products:manage");
  const { id } = await ctx.params;
  const product = await getAdminProduct(id);
  if (!product) throw ApiError.notFound("server.notFound.product");
  return ok(product);
});

export const PUT = route<{ id: string }>(async (req, ctx) => {
  const user = await requirePermission("products:manage");
  const { id } = await ctx.params;
  assertObjectId(id, "product");
  const input = await readJson(req, productInputSchema);
  await updateProduct(id, input, user);
  return ok({ id });
});

/** Quick toggles from the product list (active, featured, availability, stock). */
export const PATCH = route<{ id: string }>(async (req, ctx) => {
  const user = await requirePermission("products:manage");
  const { id } = await ctx.params;
  assertObjectId(id, "product");
  await patchProduct(id, await readJson(req, productPatchSchema), user);
  return ok({ id });
});

/** Archives products that have order history; deletes the rest. */
export const DELETE = route<{ id: string }>(async (_req, ctx) => {
  const user = await requirePermission("products:manage");
  const { id } = await ctx.params;
  assertObjectId(id, "product");
  return ok({ result: await deleteProduct(id, user) });
});
