import { ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { contentInputSchema, legalInputSchema } from "@/lib/validation";
import { updateContent, updateLegal } from "@/lib/services/admin";

/** Homepage / brand copy and imagery. */
export const PUT = route(async (req) => {
  const user = await requirePermission("content:manage");
  await updateContent(await readJson(req, contentInputSchema), user);
  return ok({ saved: true });
});

/** Legal pages (privacy, terms, returns). */
export const PATCH = route(async (req) => {
  const user = await requirePermission("content:manage");
  await updateLegal(await readJson(req, legalInputSchema), user);
  return ok({ saved: true });
});
