import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { loadSettings } from "@/lib/services/settings";
import { isEmailConfigured } from "@/lib/services/email";
import { AdminPageHeader, NoAccess } from "@/components/admin/ui";
import { getAdminI18n } from "@/i18n/server";
import { SettingsForm } from "./settings-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("admin.settings.title") };
}

async function SettingsContent() {
  await connection();
  const { t } = await getAdminI18n();
  const { allowed } = await requireStaffPage("/admin/settings", "settings:manage");
  if (!allowed) return <NoAccess what={t("admin.nav.storeSettings")} />;
  const s = await loadSettings();

  return (
    <>
      <AdminPageHeader title={t("admin.settings.title")} description={t("admin.settings.description")} />
      <SettingsForm
        initial={{ storeName: s.storeName, tagline: s.tagline, timeZone: s.timeZone, contact: s.contact, social: s.social, checkout: s.checkout, i18n: s.i18n ?? {} }}
        currency={s.currency}
        emailConfigured={isEmailConfigured()}
      />
    </>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-cream" />}>
      <SettingsContent />
    </Suspense>
  );
}
