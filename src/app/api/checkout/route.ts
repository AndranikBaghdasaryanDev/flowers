import { ok, readJson, route } from "@/lib/api/handler";
import { checkoutSchema } from "@/lib/validation";
import { getSessionUser } from "@/lib/auth/session";
import { clientIp } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createOrder } from "@/lib/services/orders";

/**
 * Places an order. Prices, fees and totals are recalculated on the server inside a
 * transaction; the idempotency key makes retries and double-clicks safe.
 */
export const POST = route(async (req) => {
  const ip = await clientIp();
  await enforceRateLimit(`checkout:${ip}`, 20, 10 * 60);
  const input = await readJson(req, checkoutSchema);
  const user = await getSessionUser();
  const result = await createOrder(input, user);
  return ok(result, { status: result.replayed ? 200 : 201 });
});
