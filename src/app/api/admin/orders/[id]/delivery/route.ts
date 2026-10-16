import { ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { deliveryAssignSchema } from "@/lib/validation";
import { assignDelivery } from "@/lib/services/orders";

export const POST = route<{ id: string }>(async (req, ctx) => {
  const user = await requirePermission("delivery:manage");
  const { id } = await ctx.params;
  const input = await readJson(req, deliveryAssignSchema);
  return ok(await assignDelivery(id, input, user));
});
