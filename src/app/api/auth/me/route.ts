import { ok, route } from "@/lib/api/handler";
import { getSessionUser } from "@/lib/auth/session";
import { getFavoriteIds } from "@/lib/services/account";

/** The signed-in user (or null) plus favourites, for client components. */
export const GET = route(async () => {
  const user = await getSessionUser();
  if (!user) return ok({ user: null, favorites: [] }, { headers: { "Cache-Control": "no-store" } });
  return ok({ user, favorites: await getFavoriteIds(user.id) }, { headers: { "Cache-Control": "no-store" } });
});
