import { ok, readJson, requireUser, route } from "@/lib/api/handler";
import { addressSchema } from "@/lib/validation";
import { listAddresses, saveAddress } from "@/lib/services/account";

export const GET = route(async () => {
  const user = await requireUser();
  return ok(await listAddresses(user.id));
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await readJson(req, addressSchema);
  return ok(await saveAddress(user.id, input), { status: 201 });
});
