import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { listAdminDeliveryMethods } from "@/lib/services/admin";
import { loadSettings } from "@/lib/services/settings";
import { NoAccess } from "@/components/admin/ui";
import { DeliveryMethodsManager } from "./delivery-methods-manager";

export const metadata = { title: "Delivery settings" };
export const instant = false;

export default async function AdminDeliverySettingsPage() {
  await connection();
  const { allowed } = await requireStaffPage("/admin/delivery/settings", "settings:manage");
  if (!allowed) return <NoAccess what="delivery settings" />;
  const [methods, settings] = await Promise.all([listAdminDeliveryMethods(), loadSettings()]);
  return <DeliveryMethodsManager methods={methods} currency={settings.currency} />;
}
