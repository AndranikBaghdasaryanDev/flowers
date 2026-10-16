import { ok, requirePermission, route } from "@/lib/api/handler";
import { listCustomers } from "@/lib/services/admin";

export const GET = route(async (req) => {
  await requirePermission("customers:read");
  const sp = req.nextUrl.searchParams;
  return ok(await listCustomers(sp.get("q")?.slice(0, 80) || undefined, Number(sp.get("page") ?? 1) || 1));
});
