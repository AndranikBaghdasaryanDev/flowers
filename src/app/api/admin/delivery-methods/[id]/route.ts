import { assertObjectId, ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { deliveryMethodInputSchema } from "@/lib/validation";
import { deleteDeliveryMethod, saveDeliveryMethod } from "@/lib/services/admin";

export const PUT = route<{ id: string }>(async (req, ctx) => {
  const user = await requirePermission("settings:manage");
  const { id } = await ctx.params;
  assertObjectId(id, "Delivery method");
  const input = await readJson(req, deliveryMethodInputSchema);
  return ok({ id: await saveDeliveryMethod(input, user, id) });
});

export const DELETE = route<{ id: string }>(async (_req, ctx) => {
  const user = await requirePermission("settings:manage");
  const { id } = await ctx.params;
  assertObjectId(id, "Delivery method");
  return ok({ result: await deleteDeliveryMethod(id, user) });
});
