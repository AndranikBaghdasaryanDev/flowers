import { ok, readQuery, requirePermission, route } from "@/lib/api/handler";
import { analyticsQuerySchema } from "@/lib/validation";
import { getAnalytics, resolveAnalyticsRange } from "@/lib/services/analytics";
import { loadSettings } from "@/lib/services/settings";

export const GET = route(async (req) => {
  await requirePermission("analytics:read");
  const q = readQuery(req, analyticsQuerySchema);
  const settings = await loadSettings();
  const range = resolveAnalyticsRange(q.range, q.from, q.to, settings.timeZone);
  return ok(await getAnalytics(range));
});
