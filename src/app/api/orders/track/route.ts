import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { ok, readJson, route } from "@/lib/api/handler";
import { clientIp } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { trackLookupSchema } from "@/lib/validation";
import { getOrderByLookup, getOrderByToken } from "@/lib/services/orders";

/** Guest order tracking with the secret link token from the confirmation. */
export const GET = route(async (req) => {
  const orderNumber = req.nextUrl.searchParams.get("order") ?? "";
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const ip = await clientIp();
  await enforceRateLimit(`track:${ip}`, 60, 10 * 60);
  const order = await getOrderByToken(orderNumber, token);
  if (!order) throw ApiError.notFound("server.errors.orderLookupFailed");
  return ok(order);
});

/** Lookup by order number + email (rate limited against enumeration). */
export const POST = route(async (req) => {
  const ip = await clientIp();
  await enforceRateLimit(`track-lookup:${ip}`, 10, 10 * 60);
  const input = await readJson(req, trackLookupSchema.extend({ website: z.string().max(0).optional() }));
  const order = await getOrderByLookup(input.orderNumber, input.email);
  if (!order) throw ApiError.notFound("server.errors.orderLookupDetails");
  return ok(order);
});
