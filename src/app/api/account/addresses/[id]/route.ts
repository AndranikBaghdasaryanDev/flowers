import { assertObjectId, ok, readJson, requireUser, route } from "@/lib/api/handler";
import { addressSchema } from "@/lib/validation";
import { deleteAddress, saveAddress } from "@/lib/services/account";

export const PUT = route<{ id: string }>(async (req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  assertObjectId(id, "address");
  const input = await readJson(req, addressSchema);
  return ok(await saveAddress(user.id, input, id));
});

export const DELETE = route<{ id: string }>(async (_req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  assertObjectId(id, "address");
  return ok(await deleteAddress(user.id, id));
});
