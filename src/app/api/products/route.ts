import { z } from "zod";
import { ok, readQuery, route } from "@/lib/api/handler";
import { getRequestLocale } from "@/i18n/server";
import { listShopProducts } from "@/lib/services/catalog";

const querySchema = z.object({
  q: z.string().max(80).optional(),
  category: z.string().max(80).optional(),
  occasion: z.string().max(80).optional(),
  min: z.coerce.number().min(0).optional(),
  max: z.coerce.number().min(0).optional(),
  available: z.enum(["1", "true"]).optional(),
  sort: z.enum(["relevance", "newest", "price_asc", "price_desc", "popular"]).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
});

/** Public catalogue listing with search, filters, sorting and pagination. */
export const GET = route(async (req) => {
  const q = readQuery(req, querySchema);
  const result = await listShopProducts({ ...q, available: Boolean(q.available) }, await getRequestLocale());
  return ok(result);
});
