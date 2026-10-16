import type { Metadata } from "next";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { listCouriers } from "@/lib/services/admin";
import { NoAccess } from "@/components/admin/ui";
import { getAdminI18n } from "@/i18n/server";
import { CouriersManager } from "./couriers-manager";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("admin.couriers.title") };
}
export const instant = false;

export default async function AdminCouriersPage() {
  await connection();
  const { allowed } = await requireStaffPage("/admin/delivery/couriers", "delivery:manage");
  if (!allowed) {
    const { t } = await getAdminI18n();
    return <NoAccess what={t("admin.couriers.title")} />;
  }
  const couriers = await listCouriers(true);
  return <CouriersManager couriers={couriers} />;
}
