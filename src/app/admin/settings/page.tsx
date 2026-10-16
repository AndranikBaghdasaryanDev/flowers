import { Suspense } from "react";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { loadSettings } from "@/lib/services/settings";
import { isEmailConfigured } from "@/lib/services/email";
import { AdminPageHeader, NoAccess } from "@/components/admin/ui";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Store settings" };

async function SettingsContent() {
  await connection();
  const { allowed } = await requireStaffPage("/admin/settings", "settings:manage");
  if (!allowed) return <NoAccess what="store settings" />;
  const s = await loadSettings();

  return (
    <>
      <AdminPageHeader title="Store settings" description="Store details, contact information, social links and checkout rules." />
      <SettingsForm
        initial={{ storeName: s.storeName, tagline: s.tagline, timeZone: s.timeZone, contact: s.contact, social: s.social, checkout: s.checkout }}
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
