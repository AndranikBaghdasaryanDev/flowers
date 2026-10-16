import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Breadcrumbs } from "@/components/store/page-header";
import { ShopView, type RawSearchParams } from "@/components/store/shop-view";
import { ProductGridSkeleton } from "@/components/store/product-grid";
import { Skeleton } from "@/components/ui/spinner";
import { getPublicCategory } from "@/lib/services/catalog";
import { getStoreI18n } from "@/i18n/server";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/categories/[slug]">): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const { locale, t } = await getStoreI18n();
  const category = await getPublicCategory(slug, locale).catch(() => null);
  if (!category) return { title: t("notFound.title"), robots: { index: false } };
  const description = category.seoDescription || category.description || t("category.metaDescription", { name: category.name });
  return {
    title: category.seoTitle || category.name,
    description,
    alternates: localeAlternates(`/categories/${category.slug}`, locale),
    openGraph: { title: category.name, description, images: category.image ? [{ url: category.image.src, alt: category.image.alt }] : undefined },
  };
}

async function CategoryContent({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<RawSearchParams> }) {
  await connection();
  const { slug } = await params;
  const { locale, t } = await getStoreI18n();
  const category = await getPublicCategory(slug, locale);
  if (!category) notFound();
  return (
    <>
      <header className="container-page pb-10 pt-8 sm:pt-10">
        <Breadcrumbs
          items={[
            { label: t("nav.home"), href: "/" },
            { label: category.kind === "occasion" ? t("nav.occasions") : t("nav.collections"), href: category.kind === "occasion" ? "/categories#occasions" : "/categories" },
            { label: category.name },
          ]}
        />
        <div className="mt-6 grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <p className="eyebrow">{category.kind === "occasion" ? t("category.flowersFor") : t("category.collection")}</p>
            <h1 className="mt-3 font-display text-[2.6rem] leading-[1.05] text-ink sm:text-[3.4rem]">{category.name}</h1>
            {category.description && <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">{category.description}</p>}
          </div>
          {category.image && (
            <div className="relative hidden h-44 w-36 overflow-hidden rounded-t-[999px] rounded-b-2xl bg-cream md:block">
              <Image src={category.image.src} alt={category.image.alt} fill sizes="144px" className="object-cover" priority />
            </div>
          )}
        </div>
      </header>
      <div className="container-page pb-24">
        <ShopView searchParams={await searchParams} basePath={`/categories/${category.slug}`} lockedCategory={category.slug} lockedKind={category.kind} />
      </div>
    </>
  );
}

export default function CategoryPage({ params, searchParams }: PageProps<"/[locale]/categories/[slug]">) {
  return (
    <Suspense
      fallback={
        <div className="container-page pb-24 pt-10">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-8 h-14 w-80" />
          <Skeleton className="mb-12 mt-4 h-5 w-96 max-w-full" />
          <ProductGridSkeleton count={6} columns={3} />
        </div>
      }
    >
      <CategoryContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
