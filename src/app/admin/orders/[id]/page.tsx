import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { getStaffOrder } from "@/lib/services/orders";
import { listCouriers } from "@/lib/services/admin";
import { loadSettings } from "@/lib/services/settings";
import { hasPermission } from "@/lib/domain/roles";
import { AdminPageHeader, NoAccess } from "@/components/admin/ui";
import { OrderManager } from "./order-manager";

export const metadata = { title: "Order" };
export const instant = false;

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await connection();
  const { id } = await params;
  const { user, allowed } = await requireStaffPage(`/admin/orders/${id}`, "orders:read");
  if (!allowed) return <NoAccess what="orders" />;
  const [order, settings] = await Promise.all([getStaffOrder(id), loadSettings()]);
  if (!order) notFound();
  const couriers = hasPermission(user.role, "delivery:manage") ? await listCouriers(true) : [];
  return (
    <>
      <AdminPageHeader title="Order details" crumbs={[{ label: "Orders", href: "/admin/orders" }, { label: order.orderNumber }]} />
      <OrderManager key={order.id} initial={order} couriers={couriers} role={user.role} timeZone={settings.timeZone} />
    </>
  );
}
