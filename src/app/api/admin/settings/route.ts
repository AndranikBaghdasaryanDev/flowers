import { ok, readJson, requirePermission, route } from "@/lib/api/handler";
import { settingsInputSchema } from "@/lib/validation";
import { updateStoreSettings } from "@/lib/services/admin";
import { loadSettings } from "@/lib/services/settings";
import { isEmailConfigured } from "@/lib/services/email";

export const GET = route(async () => {
  await requirePermission("settings:manage");
  return ok({ settings: await loadSettings(), emailConfigured: isEmailConfigured() });
});

export const PUT = route(async (req) => {
  const user = await requirePermission("settings:manage");
  const input = await readJson(req, settingsInputSchema);
  await updateStoreSettings(input, user);
  return ok(await loadSettings());
});
