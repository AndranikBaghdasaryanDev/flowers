import { z } from "zod";
import { ok, readJson, requireUser, route } from "@/lib/api/handler";
import { objectIdSchema } from "@/lib/validation";
import { getFavoriteIds, setFavorite } from "@/lib/services/account";

export const GET = route(async () => {
  const user = await requireUser();
  return ok(await getFavoriteIds(user.id));
});

export const PUT = route(async (req) => {
  const user = await requireUser();
  const input = await readJson(req, z.object({ productId: objectIdSchema, favorite: z.boolean() }));
  return ok(await setFavorite(user.id, input.productId, input.favorite));
});
