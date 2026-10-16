import type { Metadata } from "next";
import { Link } from "@/i18n/client";
import { connection } from "next/server";
import { Bell } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { getStoreI18n } from "@/i18n/server";
import { listInAppNotifications, markNotificationsRead } from "@/lib/services/account";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getStoreI18n();
  return { title: t("account.nav.notifications") };
}
export const instant = false;

export default async function NotificationsPage() {
  await connection();
  const user = await requirePageUser("/account/notifications");
  const items = await listInAppNotifications(user.id);
  const { t, f } = await getStoreI18n();
  // Viewing the page marks notifications as read (shown unread on this visit).
  if (items.some((i) => !i.read)) await markNotificationsRead(user.id);
  return (
    <div>
      <h1 className="mb-6 font-display text-[2.4rem] leading-tight text-ink">{t("account.nav.notifications")}</h1>
      {items.length === 0 ? (
        <EmptyState icon={<Bell className="h-6 w-6" />} title={t("account.notifications.emptyTitle")} description={t("account.notifications.emptyText")} />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[1.5rem] border border-line bg-paper">
          {items.map((n) => (
            <li key={n.id} className={cn("flex gap-4 px-5 py-4 sm:px-6", !n.read && "bg-brand-50/50")}>
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{n.subject}</p>
                <p className="mt-0.5 text-sm text-ink-soft">{n.body}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {f.date(n.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {n.orderId && (
                    <>
                      {" · "}
                      <Link href={`/account/orders/${n.orderId}`} className="font-semibold text-brand hover:underline">
                        {t("account.notifications.viewOrder")}
                      </Link>
                    </>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
