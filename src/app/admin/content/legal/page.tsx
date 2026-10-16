import { Suspense } from "react";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { loadSettings } from "@/lib/services/settings";
import { AdminPageHeader, NoAccess } from "@/components/admin/ui";
import { LegalForm } from "./legal-form";
import { getAdminI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { t } = await getAdminI18n();
  return { title: t("admin.legal.title") };
}

async function LegalContent() {
  await connection();
  const { allowed } = await requireStaffPage("/admin/content/legal", "content:manage");
  const { t } = await getAdminI18n();
  if (!allowed) return <NoAccess what={t("admin.nav.content")} />;
  const settings = await loadSettings();
  const { privacy, terms, returns, reviewedAt } = settings.legal;

  return (
    <>
      <AdminPageHeader
        title={t("admin.legal.title")}
        description={t("admin.legal.description")}
        crumbs={[{ label: t("admin.nav.content"), href: "/admin/content" }, { label: t("admin.legal.title") }]}
      />
      <LegalForm initial={{ privacy, terms, returns }} initialI18n={settings.i18n ?? {}} reviewedAt={reviewedAt} timeZone={settings.timeZone} />
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
