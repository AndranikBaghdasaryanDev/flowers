import { ApiError } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import { getRequestLocale } from "@/i18n/server";
import { getProductBySlug } from "@/lib/services/catalog";

export const GET = route<{ slug: string }>(async (_req, ctx) => {
  const { slug } = await ctx.params;
  const product = await getProductBySlug(slug, await getRequestLocale());
  if (!product) throw ApiError.notFound("server.notFound.product");
  return ok(product);
});
