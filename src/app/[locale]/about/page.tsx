import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { PageHeader } from "@/components/store/page-header";
import { RichText } from "@/components/store/rich-text";
import { LinkButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/spinner";
import { InstagramIcon } from "@/components/ui/social-icons";
import { getSettings } from "@/lib/services/settings";
import { getStoreI18n } from "@/i18n/server";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getStoreI18n();
  return { title: t("about.title"), description: t("about.metaDescription"), alternates: localeAlternates("/about", locale) };
}

async function About() {
  await connection();
  const { locale, t } = await getStoreI18n();
  const s = await getSettings(locale);
  const body = s.content.aboutBody || s.content.storyBody;
  return (
    <div className="container-page grid gap-12 pb-24 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
      <div>
        <RichText text={body} />
        <div className="mt-10 flex flex-wrap gap-3">
          <LinkButton href="/shop">{t("about.explore")}</LinkButton>
          {s.social.instagram && (
            <LinkButton href={s.social.instagram} target="_blank" rel="noopener noreferrer" variant="outline" icon={<InstagramIcon className="h-4 w-4" />}>
              Instagram
            </LinkButton>
          )}
        </div>
      </div>
      {s.content.storyImage && (
        <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[2rem] bg-cream">
          <Image src={s.content.storyImage} alt={s.content.storyImageAlt} fill sizes="(min-width: 1024px) 40vw, 92vw" className="object-cover" />
        </div>
      )}
    </div>
  );
}

export default async function AboutPage() {
  const { t } = await getStoreI18n();
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.home"), href: "/" }, { label: t("nav.about") }]} eyebrow={t("about.eyebrow")} title={t("about.title")} />
      <Suspense fallback={<div className="container-page pb-24"><Skeleton className="h-96 w-full" /></div>}>
        <About />
      </Suspense>
    </>
  );
}
