import { ok, readJson, requireUser, route } from "@/lib/api/handler";
import { reviewInputSchema } from "@/lib/validation";
import { submitReview } from "@/lib/services/engagement";

/** Verified-purchase review submission. Reviews are published only after moderation. */
export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await readJson(req, reviewInputSchema);
  await submitReview(user, input);
  return ok({ status: "pending" }, { status: 201 });
});
