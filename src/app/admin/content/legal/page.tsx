import { Suspense } from "react";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { loadSettings } from "@/lib/services/settings";
import { AdminPageHeader, NoAccess } from "@/components/admin/ui";
import { LegalForm } from "./legal-form";

export const metadata = { title: "Legal pages" };

async function LegalContent() {
  await connection();
  const { allowed } = await requireStaffPage("/admin/content/legal", "content:manage");
  if (!allowed) return <NoAccess what="content" />;
  const settings = await loadSettings();
  const { privacy, terms, returns, reviewedAt } = settings.legal;

  return (
    <>
      <AdminPageHeader
        title="Legal pages"
        description="The privacy policy, terms & conditions and cancellations & returns texts shown on your store."
        crumbs={[{ label: "Gallery & content", href: "/admin/content" }, { label: "Legal pages" }]}
      />
      <LegalForm initial={{ privacy, terms, returns }} reviewedAt={reviewedAt} timeZone={settings.timeZone} />
    </>
  );
}

export default function AdminLegalPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-cream" />}>
      <LegalContent />
    </Suspense>
  );
}
