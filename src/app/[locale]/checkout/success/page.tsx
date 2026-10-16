import { Suspense } from "react";
import type { Metadata } from "next";
import { Link } from "@/i18n/client";
import { connection } from "next/server";
import { CheckCircle2 } from "lucide-react";
import { OrderView } from "@/components/store/order-view";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/spinner";
import { getOrderByToken } from "@/lib/services/orders";
import { getSessionUser } from "@/lib/auth/session";
import { getStoreI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getStoreI18n();
  return { title: t("checkout.successMetaTitle"), robots: { index: false, follow: false } };
}

async function Confirmation({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { t } = await getStoreI18n();
  const sp = await searchParams;
  const orderNumber = typeof sp.order === "string" ? sp.order : "";
  const token = typeof sp.token === "string" ? sp.token : "";
  const [order, user] = await Promise.all([getOrderByToken(orderNumber, token), getSessionUser()]);
  if (!order) {
    return (
      <div className="container-page py-20">
        <EmptyState
          title={t("checkout.successNotFoundTitle")}
          description={t("checkout.successNotFoundText")}
          action={<LinkButton href="/orders/track">{t("track.trackAnOrder")}</LinkButton>}
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
        <p className="eyebrow mt-6">{t("checkout.successOrder", { number: order.orderNumber })}</p>
        <h1 className="mx-auto mt-3 max-w-2xl font-display text-[2.6rem] leading-[1.05] text-ink sm:text-5xl">{t("checkout.successTitle", { name: order.customer.name.split(" ")[0] })}</h1>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-ink-soft">
          {t("checkout.successText", { email: order.customer.email })}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-muted">
          {t.rich(user ? "checkout.successKeepLinkAccount" : "checkout.successKeepLink", {
            link: (c) => (
              <Link href={trackPath} className="font-semibold text-brand hover:underline">
                {c}
              </Link>
            ),
            account: (c) => (
              <Link href={`/account/orders/${order.id}`} className="font-semibold text-brand hover:underline">
                {c}
              </Link>
            ),
          })}
        </p>
      </section>
      <div className="container-page pb-24">
        <OrderView order={order} cancelUrl="/api/orders/track/cancel" cancelBody={{ orderNumber: order.orderNumber, token }} />
      </div>
    </>
  );
}

export default function SuccessPage({ searchParams }: PageProps<"/[locale]/checkout/success">) {
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
