import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requirePageUser } from "@/lib/auth/guards";
import { getOrderForUser } from "@/lib/services/orders";
import { OrderView } from "@/components/store/order-view";

export const metadata: Metadata = { title: "Order details" };
export const instant = false;

export default async function AccountOrderPage({ params }: PageProps<"/account/orders/[id]">) {
  await connection();
  const { id } = await params;
  const user = await requirePageUser(`/account/orders/${id}`);
  // Ownership is enforced inside getOrderForUser; another customer's order is simply "not found".
  const order = await getOrderForUser(id, user);
  if (!order) notFound();
  return (
    <div>
      <Link href="/account/orders" className="text-sm font-semibold text-brand hover:underline">
        ← All orders
      </Link>
      <h1 className="mb-6 mt-3 font-display text-[2.4rem] leading-tight text-ink">Order {order.orderNumber}</h1>
      <OrderView order={order} cancelUrl={`/api/account/orders/${order.id}/cancel`} canReview />
    </div>
  );
}
