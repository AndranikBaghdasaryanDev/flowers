import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { ok, readJson, requireUser, route } from "@/lib/api/handler";
import { resendVerification, verifyEmail } from "@/lib/services/auth";

/** Confirms an email address with a single-use token. */
export const POST = route(async (req) => {
  const { token } = await readJson(req, z.object({ token: z.string().min(20).max(128) }));
  const verified = await verifyEmail(token);
  if (!verified) throw ApiError.validation("This confirmation link is invalid or has expired.");
  return ok({ verified: true });
});

/** Re-sends the verification email to the signed-in user. */
export const PUT = route(async () => {
  const user = await requireUser();
  return ok(await resendVerification(user.id));
});
