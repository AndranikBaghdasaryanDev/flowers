import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/store/page-header";
import { RichText } from "@/components/store/rich-text";
import { Skeleton } from "@/components/ui/spinner";
import { getSettings } from "@/lib/services/settings";

const PAGES = {
  privacy: { title: "Privacy policy", field: "privacy" },
  terms: { title: "Terms & conditions", field: "terms" },
  returns: { title: "Cancellations & returns", field: "returns" },
} as const;

type Key = keyof typeof PAGES;

export function generateStaticParams() {
  return Object.keys(PAGES).map((page) => ({ page }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[page]">): Promise<Metadata> {
  const { page } = await params;
  const def = PAGES[page as Key];
  return def ? { title: def.title, alternates: { canonical: `/legal/${page}` } } : { title: "Not found" };
}

async function Legal({ page }: { page: Key }) {
  await connection();
  const s = await getSettings();
  const text = s.legal[PAGES[page].field];
  return (
    <div className="container-page max-w-3xl pb-24">
      {text ? <RichText text={text} /> : <p className="text-ink-soft">This page is being prepared.</p>}
      {s.legal.reviewedAt && <p className="mt-10 text-sm text-ink-muted">Last reviewed {new Date(s.legal.reviewedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.</p>}
    </div>
  );
}

export default async function LegalPage({ params }: PageProps<"/legal/[page]">) {
  const { page } = await params;
  if (!(page in PAGES)) notFound();
  const key = page as Key;
  return (
    <>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: PAGES[key].title }]} title={PAGES[key].title} />
      <Suspense fallback={<div className="container-page max-w-3xl pb-24"><Skeleton className="h-96 w-full" /></div>}>
        <Legal page={key} />
      </Suspense>
    </>
  );
}
