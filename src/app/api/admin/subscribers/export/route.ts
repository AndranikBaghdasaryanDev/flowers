import { requirePermission, route } from "@/lib/api/handler";
import { NewsletterSubscriber } from "@/lib/models/content";
import { csvResponse, toCsv } from "@/lib/csv";
import { getAdminLocale, translatorFor } from "@/i18n/server";

export const GET = route(async () => {
  await requirePermission("customers:read");
  const subs = await NewsletterSubscriber.find({ status: "subscribed" }).sort({ createdAt: -1 }).lean();
  const t = translatorFor(await getAdminLocale());
  const headers = [t("admin.subscribers.csv.email"), t("admin.subscribers.csv.subscribedAt"), t("admin.subscribers.csv.source")];
  const csv = toCsv(headers, subs.map((s) => [s.email, new Date(s.createdAt).toISOString(), s.source]));
  return csvResponse("floriani-newsletter-subscribers.csv", csv);
});
