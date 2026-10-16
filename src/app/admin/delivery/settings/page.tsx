import type { Metadata } from "next";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { listAdminDeliveryMethods } from "@/lib/services/admin";
import { loadSettings } from "@/lib/services/settings";
import { NoAccess } from "@/components/admin/ui";
import { getAdminI18n } from "@/i18n/server";
import { DeliveryMethodsManager } from "./delivery-methods-manager";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("admin.delivery.settingsTitle") };
}
export const instant = false;

export default async function AdminDeliverySettingsPage() {
  await connection();
  const { allowed } = await requireStaffPage("/admin/delivery/settings", "settings:manage");
  if (!allowed) {
    const { t } = await getAdminI18n();
    return <NoAccess what={t("admin.nav.deliverySettings")} />;
  }
  const [methods, settings] = await Promise.all([listAdminDeliveryMethods(), loadSettings()]);
  return <DeliveryMethodsManager methods={methods} currency={settings.currency} />;
}
