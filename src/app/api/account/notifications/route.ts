import { ok, requireUser, route } from "@/lib/api/handler";
import { listInAppNotifications, markNotificationsRead } from "@/lib/services/account";

export const GET = route(async () => {
  const user = await requireUser();
  return ok(await listInAppNotifications(user.id));
});

export const POST = route(async () => {
  const user = await requireUser();
  await markNotificationsRead(user.id);
  return ok({ read: true });
});
