import { ok, readJson, route } from "@/lib/api/handler";
import { resetPasswordSchema } from "@/lib/validation";
import { resetPassword } from "@/lib/services/auth";

export const POST = route(async (req) => {
  const input = await readJson(req, resetPasswordSchema);
  await resetPassword(input);
  return ok({ reset: true });
});
