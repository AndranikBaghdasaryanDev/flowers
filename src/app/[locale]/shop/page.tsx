import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/store/page-header";
import { ShopView, type RawSearchParams } from "@/components/store/shop-view";
import { ProductGridSkeleton } from "@/components/store/product-grid";
import { getStoreI18n } from "@/i18n/server";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getStoreI18n();
  return { title: t("shop.metaTitle"), description: t("shop.metaDescription"), alternates: localeAlternates("/shop", locale) };
}

async function Results({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await connection();
  return <ShopView searchParams={await searchParams} basePath="/shop" />;
}

export default async function ShopPage({ searchParams }: PageProps<"/[locale]/shop">) {
  const { t } = await getStoreI18n();
  return (
    <>
      <PageHeader
        crumbs={[{ label: t("nav.home"), href: "/" }, { label: t("nav.shop") }]}
        eyebrow={t("shop.eyebrow")}
        title={t("shop.title")}
        description={t("shop.subtitle")}
      />
      <div className="container-page pb-24">
        <Suspense fallback={<ProductGridSkeleton count={6} columns={3} />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
