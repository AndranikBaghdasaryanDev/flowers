import { Suspense } from "react";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { listStaff } from "@/lib/services/admin";
import { loadSettings } from "@/lib/services/settings";
import { AdminPageHeader, NoAccess } from "@/components/admin/ui";
import { StaffManager } from "./staff-manager";

export const metadata = { title: "Staff" };

async function StaffContent() {
  await connection();
  const { user, allowed } = await requireStaffPage("/admin/staff", "staff:manage");
  if (!allowed) return <NoAccess what="staff management" />;
  const [staff, settings] = await Promise.all([listStaff(), loadSettings()]);
  return (
    <>
      <AdminPageHeader title="Staff" description="People who can sign in to this admin, and what each of them can do." />
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
