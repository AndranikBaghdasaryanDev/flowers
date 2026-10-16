import { ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { deliveryMethodInputSchema } from "@/lib/validation";
import { listAdminDeliveryMethods, saveDeliveryMethod } from "@/lib/services/admin";

export const GET = route(async () => {
  await requirePermission("settings:manage");
  return ok(await listAdminDeliveryMethods());
});

export const POST = route(async (req) => {
  const user = await requirePermission("settings:manage");
  const input = await readJson(req, deliveryMethodInputSchema);
  return ok({ id: await saveDeliveryMethod(input, user) }, { status: 201 });
});
