import { ok, requirePermission, route } from "@/lib/api/handler";
import { listReviewsAdmin } from "@/lib/services/admin";

export const GET = route(async (req) => {
  await requirePermission("reviews:manage");
  const sp = req.nextUrl.searchParams;
  return ok(await listReviewsAdmin(sp.get("status") ?? undefined, Number(sp.get("page") ?? 1) || 1));
});
