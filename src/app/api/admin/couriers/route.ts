import { ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { courierInputSchema } from "@/lib/validation";
import { listCouriers, saveCourier } from "@/lib/services/admin";

export const GET = route(async () => {
  await requirePermission("delivery:manage");
  return ok(await listCouriers());
});

export const POST = route(async (req) => {
  const user = await requirePermission("delivery:manage");
  const input = await readJson(req, courierInputSchema);
  return ok({ id: await saveCourier(input, user) }, { status: 201 });
});
