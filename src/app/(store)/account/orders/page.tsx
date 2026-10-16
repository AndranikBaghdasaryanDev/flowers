import type { Metadata } from "next";
import { connection } from "next/server";
import { Package } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { listOrdersForUser } from "@/lib/services/orders";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { OrderList } from "../order-list";

export const metadata: Metadata = { title: "Orders" };
export const instant = false;

export default async function AccountOrdersPage({ searchParams }: PageProps<"/account/orders">) {
  await connection();
  const user = await requirePageUser("/account/orders");
  const sp = await searchParams;
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);
  const orders = await listOrdersForUser(user.id, page);
  return (
    <div>
      <h1 className="mb-6 font-display text-[2.4rem] leading-tight text-ink">Orders</h1>
      {orders.items.length ? (
        <>
          <OrderList orders={orders.items} />
          <Pagination className="mt-8" page={orders.page} pageCount={orders.pageCount} basePath="/account/orders" params={{}} />
        </>
      ) : (
        <EmptyState icon={<Package className="h-6 w-6" />} title="No orders yet" description="Your orders and their delivery status will appear here." action={<LinkButton href="/shop">Explore the shop</LinkButton>} />
      )}
    </div>
  );
}
