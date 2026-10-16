import { ok, requireUser, route } from "@/lib/api/handler";
import { listOrdersForUser } from "@/lib/services/orders";

export const GET = route(async (req) => {
  const user = await requireUser();
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1) || 1);
  return ok(await listOrdersForUser(user.id, page));
});
