import { ApiError } from "@/lib/api/errors";
import { ok, requirePermission, route } from "@/lib/api/handler";
import { getStaffOrder } from "@/lib/services/orders";

export const GET = route<{ id: string }>(async (_req, ctx) => {
  await requirePermission("orders:read");
  const { id } = await ctx.params;
  const order = await getStaffOrder(id);
  if (!order) throw ApiError.notFound("server.notFound.order");
  return ok(order, { headers: { "Cache-Control": "no-store" } });
});
