import { ok, requirePermission, route } from "@/lib/api/handler";
import { listAudit } from "@/lib/services/admin";

export const GET = route(async (req) => {
  await requirePermission("audit:read");
  const sp = req.nextUrl.searchParams;
  return ok(await listAudit(Number(sp.get("page") ?? 1) || 1, sp.get("entity") ?? undefined));
});
