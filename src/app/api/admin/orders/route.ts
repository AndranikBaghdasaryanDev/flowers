import { ok, readQuery, requirePermission, route } from "@/lib/api/handler";
import { orderListQuerySchema } from "@/lib/validation";
import { listOrdersAdmin } from "@/lib/services/orders";

export const GET = route(async (req) => {
  await requirePermission("orders:read");
  return ok(await listOrdersAdmin(readQuery(req, orderListQuerySchema)));
});
