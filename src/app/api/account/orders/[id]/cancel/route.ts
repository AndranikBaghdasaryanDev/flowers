import { ok, requireUser, route } from "@/lib/api/handler";
import { cancelOwnOrder, getOrderForUser } from "@/lib/services/orders";

export const POST = route<{ id: string }>(async (_req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await cancelOwnOrder(id, user);
  return ok(await getOrderForUser(id, user));
});
