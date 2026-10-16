import { ApiError } from "@/lib/api/errors";
import { ok, requireUser, route } from "@/lib/api/handler";
import { getOrderForUser } from "@/lib/services/orders";

/** Returns the order only if it belongs to the signed-in customer (server-side ownership check). */
export const GET = route<{ id: string }>(async (_req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const order = await getOrderForUser(id, user);
  if (!order) throw ApiError.notFound("Order not found.");
  return ok(order, { headers: { "Cache-Control": "no-store" } });
});
