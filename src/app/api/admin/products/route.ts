import { ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { productInputSchema } from "@/lib/validation";
import { createProduct, listAdminProducts } from "@/lib/services/admin-catalog";

export const GET = route(async (req) => {
  await requirePermission("products:manage");
  const sp = req.nextUrl.searchParams;
  return ok(
    await listAdminProducts({
      q: sp.get("q") ?? undefined,
      category: sp.get("category") ?? undefined,
      status: sp.get("status") ?? undefined,
      availability: sp.get("availability") ?? undefined,
      page: Number(sp.get("page") ?? 1) || 1,
    }),
  );
});

export const POST = route(async (req) => {
  const user = await requirePermission("products:manage");
  const input = await readJson(req, productInputSchema);
  return ok({ id: await createProduct(input, user) }, { status: 201 });
});
