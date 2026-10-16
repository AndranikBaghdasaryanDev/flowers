import { ok, readJson, requireUser, route } from "@/lib/api/handler";
import { profileSchema } from "@/lib/validation";
import { getProfile, updateProfile } from "@/lib/services/account";

export const GET = route(async () => {
  const user = await requireUser();
  return ok(await getProfile(user.id));
});

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const input = await readJson(req, profileSchema);
  await updateProfile(user.id, input);
  return ok(await getProfile(user.id));
});
