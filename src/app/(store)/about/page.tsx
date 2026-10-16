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

export const metadata: Metadata = {
  title: "About Floriani",
  description: "Floriani Flowers composes bouquets, flower boxes and arrangements by hand, with delivery in Yerevan.",
  alternates: { canonical: "/about" },
};

async function About() {
  await connection();
  const s = await getSettings();
  const body = s.content.aboutBody || s.content.storyBody;
  return (
    <div className="container-page grid gap-12 pb-24 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
      <div>
        <RichText text={body} />
        <div className="mt-10 flex flex-wrap gap-3">
          <LinkButton href="/shop">Explore the collection</LinkButton>
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

export default function AboutPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "About" }]} eyebrow="Our story" title="About Floriani" />
      <Suspense fallback={<div className="container-page pb-24"><Skeleton className="h-96 w-full" /></div>}>
        <About />
      </Suspense>
    </>
  );
}
