import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { getStaffOrder } from "@/lib/services/orders";
import { listCouriers } from "@/lib/services/admin";
import { loadSettings } from "@/lib/services/settings";
import { hasPermission } from "@/lib/domain/roles";
import { AdminPageHeader, NoAccess } from "@/components/admin/ui";
import { getAdminI18n } from "@/i18n/server";
import { OrderManager } from "./order-manager";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return { title: t("admin.orders.order") };
}
export const instant = false;

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await connection();
  const { id } = await params;
  const { t } = await getAdminI18n();
  const { user, allowed } = await requireStaffPage(`/admin/orders/${id}`, "orders:read");
  if (!allowed) return <NoAccess what={t("admin.nav.orders")} />;
  const [order, settings] = await Promise.all([getStaffOrder(id), loadSettings()]);
  if (!order) notFound();
  const couriers = hasPermission(user.role, "delivery:manage") ? await listCouriers(true) : [];
  return (
    <>
      <AdminPageHeader title={t("admin.orders.details")} crumbs={[{ label: t("admin.orders.title"), href: "/admin/orders" }, { label: order.orderNumber }]} />
      <OrderManager key={order.id} initial={order} couriers={couriers} role={user.role} timeZone={settings.timeZone} />
    </>
  );
}
