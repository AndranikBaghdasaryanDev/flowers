import type { Metadata } from "next";
import { connection } from "next/server";
import { Package } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { getStoreI18n } from "@/i18n/server";
import { listOrdersForUser } from "@/lib/services/orders";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { OrderList } from "../order-list";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getStoreI18n();
  return { title: t("account.nav.orders") };
}
export const instant = false;

export default async function AccountOrdersPage({ searchParams }: PageProps<"/[locale]/account/orders">) {
  await connection();
  const user = await requirePageUser("/account/orders");
  const { t } = await getStoreI18n();
  const sp = await searchParams;
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);
  const orders = await listOrdersForUser(user.id, page);
  return (
    <div>
      <h1 className="mb-6 font-display text-[2.4rem] leading-tight text-ink">{t("account.nav.orders")}</h1>
      {orders.items.length ? (
        <>
          <OrderList orders={orders.items} />
          <Pagination className="mt-8" page={orders.page} pageCount={orders.pageCount} basePath="/account/orders" params={{}} />
        </>
      ) : (
        <EmptyState icon={<Package className="h-6 w-6" />} title={t("account.noOrdersTitle")} description={t("account.noOrdersText")} action={<LinkButton href="/shop">{t("account.exploreShop")}</LinkButton>} />
      )}
    </div>
  );
}
