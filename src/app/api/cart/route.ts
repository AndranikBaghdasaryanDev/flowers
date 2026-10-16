import { z } from "zod";
import { ok, readJson, requireUser, route } from "@/lib/api/handler";
import { cartSchema } from "@/lib/validation";
import { getServerCart, saveServerCart } from "@/lib/services/account";
import { getSettings } from "@/lib/services/settings";

/** Signed-in customers keep their cart on the server. */
export const GET = route(async () => {
  const user = await requireUser();
  return ok(await getServerCart(user.id));
});

const putSchema = cartSchema.extend({ mode: z.enum(["replace", "merge"]).default("replace") });

export const PUT = route(async (req) => {
  const user = await requireUser();
  const input = await readJson(req, putSchema);
  const settings = await getSettings();
  return ok(await saveServerCart(user.id, input.items, input.giftMessage, input.mode, settings.checkout.maxQuantityPerItem));
});
