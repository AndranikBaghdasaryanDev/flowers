import { assertObjectId, ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { reviewModerationSchema } from "@/lib/validation";
import { moderateReview } from "@/lib/services/admin";

export const PATCH = route<{ id: string }>(async (req, ctx) => {
  const user = await requirePermission("reviews:manage");
  const { id } = await ctx.params;
  assertObjectId(id, "Review");
  const { status } = await readJson(req, reviewModerationSchema);
  await moderateReview(id, status, user);
  return ok({ status });
});
