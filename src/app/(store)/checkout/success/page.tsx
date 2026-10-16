import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CheckCircle2 } from "lucide-react";
import { OrderView } from "@/components/store/order-view";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/spinner";
import { getOrderByToken } from "@/lib/services/orders";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Thank you for your order", robots: { index: false, follow: false } };

async function Confirmation({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const sp = await searchParams;
  const orderNumber = typeof sp.order === "string" ? sp.order : "";
  const token = typeof sp.token === "string" ? sp.token : "";
  const [order, user] = await Promise.all([getOrderByToken(orderNumber, token), getSessionUser()]);
  if (!order) {
    return (
      <div className="container-page py-20">
        <EmptyState
          title="We could not find this order"
          description="The confirmation link may be incomplete. You can look up your order with its number and your email."
          action={<LinkButton href="/orders/track">Track an order</LinkButton>}
        />
      </div>
    );
  }
  const trackPath = `/orders/track?order=${encodeURIComponent(order.orderNumber)}&token=${encodeURIComponent(token)}`;
  return (
    <>
      <section className="container-page pb-10 pt-12 text-center sm:pt-16">
        <span className="mx-auto flex h-16 w-16 animate-fade-up items-center justify-center rounded-full bg-success-50 text-success">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <p className="eyebrow mt-6">Order {order.orderNumber}</p>
        <h1 className="mx-auto mt-3 max-w-2xl font-display text-[2.6rem] leading-[1.05] text-ink sm:text-5xl">Thank you, {order.customer.name.split(" ")[0]}.</h1>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-ink-soft">
          We have received your order and will confirm it shortly. A confirmation has been prepared for {order.customer.email}.
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-muted">
          Keep this page’s link to follow your order:{" "}
          <Link href={trackPath} className="font-semibold text-brand hover:underline">
            tracking link
          </Link>
          {user ? (
            <>
              {" "}or find it in{" "}
              <Link href={`/account/orders/${order.id}`} className="font-semibold text-brand hover:underline">
                your account
              </Link>
            </>
          ) : null}
          .
        </p>
      </section>
      <div className="container-page pb-24">
        <OrderView order={order} cancelUrl="/api/orders/track/cancel" cancelBody={{ orderNumber: order.orderNumber, token }} />
      </div>
    </>
  );
}

export default function SuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  return (
    <Suspense
      fallback={
        <div className="container-page space-y-6 py-16">
          <Skeleton className="mx-auto h-16 w-16 rounded-full" />
          <Skeleton className="mx-auto h-12 w-96 max-w-full" />
          <Skeleton className="h-80 w-full rounded-[1.5rem]" />
        </div>
      }
    >
      <Confirmation searchParams={searchParams} />
    </Suspense>
  );
}
