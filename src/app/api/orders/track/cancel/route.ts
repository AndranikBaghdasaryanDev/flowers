import { z } from "zod";
import { ok, readJson, route } from "@/lib/api/handler";
import { cancelOrderByToken, getOrderByToken } from "@/lib/services/orders";

const schema = z.object({ orderNumber: z.string().min(3).max(32), token: z.string().min(20).max(128) });

/** Guest self-cancellation while the order is still pending (requires the secret tracking token). */
export const POST = route(async (req) => {
  const input = await readJson(req, schema);
  await cancelOrderByToken(input.orderNumber, input.token);
  return ok(await getOrderByToken(input.orderNumber, input.token));
});
