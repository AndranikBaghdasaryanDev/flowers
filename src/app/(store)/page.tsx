import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Hero } from "@/components/home/hero";
import {
  BrandStory,
  CategoryShowcase,
  DeliverySection,
  FeaturedProducts,
  GallerySection,
  OccasionShowcase,
  Testimonials,
} from "@/components/home/sections";
import { Skeleton } from "@/components/ui/spinner";
import { ProductGridSkeleton } from "@/components/store/product-grid";
import { getSettings } from "@/lib/services/settings";
import { getFeaturedProducts, listPublicCategories } from "@/lib/services/catalog";
import { listActiveDeliveryMethods } from "@/lib/services/delivery";
import { getTestimonials } from "@/lib/services/engagement";
import { listGallery } from "@/lib/services/admin";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: { absolute: `${brand.name} — Bouquets & flower delivery in Yerevan` },
  description: brand.description,
  alternates: { canonical: "/" },
};

async function HomeContent() {
  await connection();
  const [settings, categories, featured, methods, reviews, gallery] = await Promise.all([
    getSettings(),
    listPublicCategories(),
    getFeaturedProducts(8),
    listActiveDeliveryMethods(),
    getTestimonials(),
    listGallery(true),
  ]);
  const collections = categories.filter((c) => c.kind === "collection");
  const occasions = categories.filter((c) => c.kind === "occasion");
  const deliveryCity = methods.find((m) => m.type === "delivery" && m.city)?.city ?? null;

  return (
    <>
      <Hero content={settings.content} featured={featured[0] ?? null} deliveryCity={deliveryCity} />
      <CategoryShowcase categories={collections.filter((c) => c.isFeatured).length >= 3 ? collections.filter((c) => c.isFeatured) : collections} />
      <FeaturedProducts products={featured} />
      <BrandStory content={settings.content} />
      <OccasionShowcase occasions={occasions} />
      <DeliverySection methods={methods} currency={settings.currency} deliveryInfo={settings.content.deliveryInfo} />
      <Testimonials reviews={reviews} />
      <GallerySection items={gallery} instagramUrl={settings.social.instagram} />
    </>
  );
}

function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="container-page grid gap-10 pb-16 pt-12 lg:grid-cols-2">
        <div className="space-y-5 pt-10">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-4/5" />
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-13 w-40 rounded-full" />
            <Skeleton className="h-13 w-48 rounded-full" />
          </div>
        </div>
        <Skeleton className="aspect-[4/5] w-full rounded-t-[999px] rounded-b-[2rem]" />
      </div>
      <div className="container-page py-16">
        <ProductGridSkeleton count={4} />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}
