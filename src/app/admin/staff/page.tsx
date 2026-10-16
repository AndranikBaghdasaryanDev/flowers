import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { listStaff } from "@/lib/services/admin";
import { loadSettings } from "@/lib/services/settings";
import { AdminPageHeader, NoAccess } from "@/components/admin/ui";
import { getAdminI18n } from "@/i18n/server";
import { StaffManager } from "./staff-manager";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("admin.staff.title") };
}

async function StaffContent() {
  await connection();
  const { t } = await getAdminI18n();
  const { user, allowed } = await requireStaffPage("/admin/staff", "staff:manage");
  if (!allowed) return <NoAccess what={t("admin.nav.staff")} />;
  const [staff, settings] = await Promise.all([listStaff(), loadSettings()]);
  return (
    <>
      <AdminPageHeader title={t("admin.staff.title")} description={t("admin.staff.description")} />
      <StaffManager initial={staff} currentUserId={user.id} currentRole={user.role} timeZone={settings.timeZone} />
    </>
  );
}

export default function AdminStaffPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-cream" />}>
      <StaffContent />
    </Suspense>
  );
}
