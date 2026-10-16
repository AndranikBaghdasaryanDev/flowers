import { requirePermission, route } from "@/lib/api/handler";
import { NewsletterSubscriber } from "@/lib/models/content";
import { csvResponse, toCsv } from "@/lib/csv";

export const GET = route(async () => {
  await requirePermission("customers:read");
  const subs = await NewsletterSubscriber.find({ status: "subscribed" }).sort({ createdAt: -1 }).lean();
  const csv = toCsv(["Email", "Subscribed at", "Source"], subs.map((s) => [s.email, new Date(s.createdAt).toISOString(), s.source]));
  return csvResponse("floriani-newsletter-subscribers.csv", csv);
});
