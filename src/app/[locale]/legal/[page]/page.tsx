import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/store/page-header";
import { RichText } from "@/components/store/rich-text";
import { Skeleton } from "@/components/ui/spinner";
import { getSettings } from "@/lib/services/settings";
import { getStoreI18n } from "@/i18n/server";
import { localeAlternates } from "@/i18n/metadata";

const PAGES = {
  privacy: { title: "legal.privacyTitle", field: "privacy" },
  terms: { title: "legal.termsTitle", field: "terms" },
  returns: { title: "legal.returnsTitle", field: "returns" },
} as const;

type Key = keyof typeof PAGES;

export function generateStaticParams() {
  return Object.keys(PAGES).map((page) => ({ page }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/legal/[page]">): Promise<Metadata> {
  const { page } = await params;
  const { locale, t } = await getStoreI18n();
  const def = PAGES[page as Key];
  return def ? { title: t(def.title), alternates: localeAlternates(`/legal/${page}`, locale) } : { title: t("notFound.title") };
}

async function Legal({ page }: { page: Key }) {
  await connection();
  const { locale, t, f } = await getStoreI18n();
  const s = await getSettings(locale);
  const text = s.legal[PAGES[page].field];
  return (
    <div className="container-page max-w-3xl pb-24">
      {text ? <RichText text={text} /> : <p className="text-ink-soft">{t("legal.preparing")}</p>}
      {s.legal.reviewedAt && <p className="mt-10 text-sm text-ink-muted">{t("legal.lastReviewed", { date: f.date(s.legal.reviewedAt, { day: "numeric", month: "long", year: "numeric" }) })}</p>}
    </div>
  );
}

export default async function LegalPage({ params }: PageProps<"/[locale]/legal/[page]">) {
  const { page } = await params;
  if (!(page in PAGES)) notFound();
  const key = page as Key;
  const { t } = await getStoreI18n();
  const title = t(PAGES[key].title);
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.home"), href: "/" }, { label: title }]} title={title} />
      <Suspense fallback={<div className="container-page max-w-3xl pb-24"><Skeleton className="h-96 w-full" /></div>}>
        <Legal page={key} />
      </Suspense>
    </>
  );
}
