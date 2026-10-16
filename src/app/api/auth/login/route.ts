import { ok, readJson, route } from "@/lib/api/handler";
import { loginSchema } from "@/lib/validation";
import { loginUser } from "@/lib/services/auth";

export const POST = route(async (req) => {
  const input = await readJson(req, loginSchema);
  return ok(await loginUser(input));
});
