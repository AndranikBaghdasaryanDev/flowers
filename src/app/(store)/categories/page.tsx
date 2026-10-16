import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/store/page-header";
import { ImageFallback } from "@/components/store/image-fallback";
import { Reveal } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/spinner";
import { listPublicCategories } from "@/lib/services/catalog";
import type { CategoryDTO } from "@/lib/types";

export const metadata: Metadata = {
  title: "Collections & occasions",
  description: "Explore Floriani collections — bouquets, roses, compositions, flower boxes, indoor plants — and flowers for every occasion.",
  alternates: { canonical: "/categories" },
};

function Grid({ items }: { items: CategoryDTO[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((c, i) => (
        <li key={c.id}>
          <Reveal delay={(i % 4) * 60}>
            <Link href={`/categories/${c.slug}`} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-cream">
                {c.image ? (
                  <Image src={c.image.src} alt={c.image.alt} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <ImageFallback />
                )}
              </div>
              <h3 className="mt-3 font-display text-2xl text-ink group-hover:text-brand">{c.name}</h3>
              {c.description && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{c.description}</p>}
            </Link>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

async function Content() {
  await connection();
  const cats = await listPublicCategories();
  const collections = cats.filter((c) => c.kind === "collection");
  const occasions = cats.filter((c) => c.kind === "occasion");
  return (
    <div className="container-page space-y-20 pb-24">
      <section aria-labelledby="col-h">
        <h2 id="col-h" className="mb-8 font-display text-3xl text-ink">Collections</h2>
        {collections.length ? <Grid items={collections} /> : <p className="text-ink-muted">Collections will appear here soon.</p>}
      </section>
      <section id="occasions" aria-labelledby="occ-h" className="scroll-mt-28">
        <h2 id="occ-h" className="mb-8 font-display text-3xl text-ink">Occasions</h2>
        {occasions.length ? <Grid items={occasions} /> : <p className="text-ink-muted">Occasions will appear here soon.</p>}
      </section>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Collections" }]} eyebrow="Explore" title="Collections & occasions" />
      <Suspense
        fallback={
          <div className="container-page grid grid-cols-2 gap-4 pb-24 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-[var(--radius-card)]" />
            ))}
          </div>
        }
      >
        <Content />
      </Suspense>
    </>
  );
}
