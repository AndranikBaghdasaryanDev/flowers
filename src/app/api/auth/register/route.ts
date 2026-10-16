import { ok, readJson, route } from "@/lib/api/handler";
import { getRequestLocale } from "@/i18n/server";
import { registerSchema } from "@/lib/validation";
import { registerUser } from "@/lib/services/auth";

export const POST = route(async (req) => {
  const input = await readJson(req, registerSchema);
  const result = await registerUser(input, await getRequestLocale());
  return ok(result, { status: 201 });
});
