import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/store/page-header";
import { OrderView } from "@/components/store/order-view";
import { Skeleton } from "@/components/ui/spinner";
import { getOrderByToken } from "@/lib/services/orders";
import { getStoreI18n } from "@/i18n/server";
import { TrackLookup } from "./track-lookup";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getStoreI18n();
  return { title: t("track.title"), robots: { index: false } };
}

async function Tracking({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const sp = await searchParams;
  const orderNumber = typeof sp.order === "string" ? sp.order : "";
  const token = typeof sp.token === "string" ? sp.token : "";
  const order = orderNumber && token ? await getOrderByToken(orderNumber, token) : null;
  if (order) return <OrderView order={order} cancelUrl="/api/orders/track/cancel" cancelBody={{ orderNumber: order.orderNumber, token }} />;
  return <TrackLookup />;
}

export default async function TrackPage({ searchParams }: PageProps<"/[locale]/orders/track">) {
  const { t } = await getStoreI18n();
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.home"), href: "/" }, { label: t("track.trackAnOrder") }]} title={t("track.title")} description={t("track.subtitle")} />
      <div className="container-page pb-24">
        <Suspense fallback={<Skeleton className="mx-auto h-80 max-w-lg rounded-[1.5rem]" />}>
          <Tracking searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
