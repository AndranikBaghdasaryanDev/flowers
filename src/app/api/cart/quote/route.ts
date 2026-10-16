import { ok, readJson, route } from "@/lib/api/handler";
import { quoteSchema } from "@/lib/validation";
import { getSettings } from "@/lib/services/settings";
import { getActiveDeliveryMethod } from "@/lib/services/delivery";
import { priceCart } from "@/lib/services/pricing";

/** Server-side pricing of a cart. The client never computes authoritative totals. */
export const POST = route(async (req) => {
  const input = await readJson(req, quoteSchema);
  const settings = await getSettings();
  const method = input.deliveryMethodId ? await getActiveDeliveryMethod(input.deliveryMethodId) : null;
  const quote = await priceCart(input.items, settings, { method, zone: input.zone || undefined });
  const { priced, ...publicQuote } = quote;
  return ok(publicQuote);
});
