import { assertObjectId, ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { courierInputSchema } from "@/lib/validation";
import { saveCourier } from "@/lib/services/admin";

/** Couriers are deactivated rather than deleted so delivery history stays meaningful. */
export const PUT = route<{ id: string }>(async (req, ctx) => {
  const user = await requirePermission("delivery:manage");
  const { id } = await ctx.params;
  assertObjectId(id, "courier");
  const input = await readJson(req, courierInputSchema);
  return ok({ id: await saveCourier(input, user, id) });
});
