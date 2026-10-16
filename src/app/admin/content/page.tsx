import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronRight, Scale } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { Settings, type SettingsDoc } from "@/lib/models/content";
import { listGallery } from "@/lib/services/admin";
import { CONTENT_DEFAULTS } from "@/lib/services/settings";
import { mediaUrl } from "@/lib/media-url";
import { AdminPageHeader, NoAccess } from "@/components/admin/ui";
import { ContentForm, type ContentFormValues } from "./content-form";
import { GalleryManager } from "./gallery-manager";

export const metadata = { title: "Gallery & content" };

/** Raw (owner-written) content — empty fields stay empty so the form never shows fallback copy as if it were saved. */
async function loadRawContent(): Promise<ContentFormValues> {
  await connectDb();
  const doc = await Settings.findById("store").select("content").lean<Pick<SettingsDoc, "content">>();
  const c = doc?.content;
  const heroId = c?.heroImage ? String(c.heroImage) : null;
  const storyId = c?.storyImage ? String(c.storyImage) : null;
  return {
    announcement: c?.announcement ?? "",
    heroEyebrow: c?.heroEyebrow ?? "",
    heroTitle: c?.heroTitle ?? "",
    heroSubtitle: c?.heroSubtitle ?? "",
    heroImage: heroId ? { id: heroId, src: mediaUrl(heroId) } : null,
    heroImageAlt: c?.heroImageAlt ?? "",
    storyTitle: c?.storyTitle ?? "",
    storyBody: c?.storyBody ?? "",
    storyImage: storyId ? { id: storyId, src: mediaUrl(storyId) } : null,
    storyImageAlt: c?.storyImageAlt ?? "",
    aboutBody: c?.aboutBody ?? "",
    deliveryInfo: c?.deliveryInfo ?? "",
  };
}

async function ContentContent() {
  await connection();
  const { allowed } = await requireStaffPage("/admin/content", "content:manage");
  if (!allowed) return <NoAccess what="content" />;
  const [content, gallery] = await Promise.all([loadRawContent(), listGallery(false)]);

  return (
    <>
      <AdminPageHeader
        title="Gallery & content"
        description="Homepage copy and imagery, the About and Delivery page texts, and the photo gallery."
      />
      <div className="space-y-8">
        <ContentForm initial={content} defaults={CONTENT_DEFAULTS} />
        <GalleryManager initial={gallery} />
        <Link
          href="/admin/content/legal"
          className="group flex items-center gap-4 rounded-2xl border border-line bg-paper p-5 transition-colors hover:border-brand/40"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand">
            <Scale className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink group-hover:text-brand">Legal pages</span>
            <span className="block text-[13px] text-ink-muted">Edit the privacy policy, terms & conditions and cancellations & returns texts.</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-ink-muted group-hover:text-brand" aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}

export default function AdminContentPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-cream" />}>
      <ContentContent />
    </Suspense>
  );
}
