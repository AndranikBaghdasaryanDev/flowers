import { Link } from "@/i18n/client";
import { connection } from "next/server";
import { Package } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { getStoreI18n } from "@/i18n/server";
import { getProfile } from "@/lib/services/account";
import { listOrdersForUser } from "@/lib/services/orders";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { ProfileForm } from "./profile-form";
import { OrderList } from "./order-list";

export const instant = false;

export default async function AccountOverviewPage() {
  await connection();
  const user = await requirePageUser("/account");
  const { t, f } = await getStoreI18n();
  const [profile, orders] = await Promise.all([getProfile(user.id), listOrdersForUser(user.id, 1)]);
  return (
    <div className="space-y-10">
      <header>
        <p className="eyebrow">{t("nav.myAccount")}</p>
        <h1 className="mt-2 font-display text-[2.4rem] leading-tight text-ink">{t("account.hello", { name: profile.name.split(" ")[0] })}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("account.memberSince", { date: f.date(profile.memberSince, { month: "long", year: "numeric" }) })}</p>
      </header>

      <section aria-labelledby="recent-h">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="recent-h" className="font-display text-2xl text-ink">{t("account.recentOrders")}</h2>
          {orders.total > 0 && (
            <Link href="/account/orders" className="text-sm font-semibold text-brand hover:underline">
              {t("account.viewAll")}
            </Link>
          )}
        </div>
        {orders.items.length ? (
          <OrderList orders={orders.items.slice(0, 3)} />
        ) : (
          <EmptyState icon={<Package className="h-6 w-6" />} title={t("account.noOrdersTitle")} description={t("account.noOrdersOverview")} action={<LinkButton href="/shop">{t("account.startShopping")}</LinkButton>} />
        )}
      </section>

      <section aria-labelledby="profile-h" className="rounded-[1.5rem] border border-line bg-paper p-5 sm:p-7">
        <h2 id="profile-h" className="mb-6 font-display text-2xl text-ink">{t("account.profile")}</h2>
        <ProfileForm initial={profile} />
      </section>
    </div>
  );
}
