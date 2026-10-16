import Link from "next/link";
import { connection } from "next/server";
import { Package } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
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
  const [profile, orders] = await Promise.all([getProfile(user.id), listOrdersForUser(user.id, 1)]);
  return (
    <div className="space-y-10">
      <header>
        <p className="eyebrow">My account</p>
        <h1 className="mt-2 font-display text-[2.4rem] leading-tight text-ink">Hello, {profile.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-ink-muted">Member since {new Date(profile.memberSince).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
      </header>

      <section aria-labelledby="recent-h">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="recent-h" className="font-display text-2xl text-ink">Recent orders</h2>
          {orders.total > 0 && (
            <Link href="/account/orders" className="text-sm font-semibold text-brand hover:underline">
              View all
            </Link>
          )}
        </div>
        {orders.items.length ? (
          <OrderList orders={orders.items.slice(0, 3)} />
        ) : (
          <EmptyState icon={<Package className="h-6 w-6" />} title="No orders yet" description="When you place an order it will appear here." action={<LinkButton href="/shop">Start shopping</LinkButton>} />
        )}
      </section>

      <section aria-labelledby="profile-h" className="rounded-[1.5rem] border border-line bg-paper p-5 sm:p-7">
        <h2 id="profile-h" className="mb-6 font-display text-2xl text-ink">Profile</h2>
        <ProfileForm initial={profile} />
      </section>
    </div>
  );
}
