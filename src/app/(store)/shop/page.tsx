import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/store/page-header";
import { ShopView, type RawSearchParams } from "@/components/store/shop-view";
import { ProductGridSkeleton } from "@/components/store/product-grid";

export const metadata: Metadata = {
  title: "Shop flowers",
  description: "Browse Floriani bouquets, roses, compositions, flower boxes and indoor plants. Filter by occasion, price and availability.",
  alternates: { canonical: "/shop" },
};

async function Results({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await connection();
  return <ShopView searchParams={await searchParams} basePath="/shop" />;
}

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Shop" }]}
        eyebrow="The collection"
        title="All flowers"
        description="Bouquets, compositions and plants — each one composed by hand."
      />
      <div className="container-page pb-24">
        <Suspense fallback={<ProductGridSkeleton count={6} columns={3} />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
