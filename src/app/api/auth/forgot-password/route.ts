import { ok, readJson, route } from "@/lib/api/handler";
import { forgotPasswordSchema } from "@/lib/validation";
import { requestPasswordReset } from "@/lib/services/auth";

/** Responds identically whether or not the email is registered. */
export const POST = route(async (req) => {
  const input = await readJson(req, forgotPasswordSchema);
  return ok(await requestPasswordReset(input.email));
});
