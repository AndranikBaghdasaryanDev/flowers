import { ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { paymentChangeSchema } from "@/lib/validation";
import { changePaymentStatus } from "@/lib/services/orders";

export const POST = route<{ id: string }>(async (req, ctx) => {
  const user = await requirePermission("payments:manage");
  const { id } = await ctx.params;
  const input = await readJson(req, paymentChangeSchema);
  return ok(await changePaymentStatus(id, input, user));
});
