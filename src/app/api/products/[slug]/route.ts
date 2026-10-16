import { ApiError } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import { getProductBySlug } from "@/lib/services/catalog";

export const GET = route<{ slug: string }>(async (_req, ctx) => {
  const { slug } = await ctx.params;
  const product = await getProductBySlug(slug);
  if (!product) throw ApiError.notFound("Product not found.");
  return ok(product);
});
