import { ok, route } from "@/lib/api/handler";
import { getRequestLocale } from "@/i18n/server";
import { listPublicCategories } from "@/lib/services/catalog";

export const GET = route(async (req) => {
  const kind = req.nextUrl.searchParams.get("kind");
  const categories = await listPublicCategories(kind === "occasion" || kind === "collection" ? kind : undefined, await getRequestLocale());
  return ok(categories);
});
