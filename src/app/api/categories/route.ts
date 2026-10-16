import { ok, route } from "@/lib/api/handler";
import { listPublicCategories } from "@/lib/services/catalog";

export const GET = route(async (req) => {
  const kind = req.nextUrl.searchParams.get("kind");
  const categories = await listPublicCategories(kind === "occasion" || kind === "collection" ? kind : undefined);
  return ok(categories);
});
