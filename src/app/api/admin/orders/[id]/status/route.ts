import { ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { statusChangeSchema } from "@/lib/validation";
import { changeOrderStatus } from "@/lib/services/orders";

/** Validated lifecycle transition; the specific permission is checked per target status. */
export const POST = route<{ id: string }>(async (req, ctx) => {
  const user = await requirePermission("orders:read");
  const { id } = await ctx.params;
  const input = await readJson(req, statusChangeSchema);
  return ok(await changeOrderStatus(id, input, user));
});
