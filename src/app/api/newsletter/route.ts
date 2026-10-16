import { ok, readJson, route } from "@/lib/api/handler";
import { newsletterSchema } from "@/lib/validation";
import { subscribeNewsletter } from "@/lib/services/engagement";

export const POST = route(async (req) => {
  const input = await readJson(req, newsletterSchema);
  await subscribeNewsletter(input.email, input.source);
  return ok({ subscribed: true });
});
