import { ok, readJson, requireUser, route } from "@/lib/api/handler";
import { changePasswordSchema } from "@/lib/validation";
import { changePassword } from "@/lib/services/auth";

/** Changes the password and signs out every other session. */
export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await readJson(req, changePasswordSchema);
  await changePassword(user.id, input.currentPassword, input.password);
  return ok({ changed: true });
});
