import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { listCouriers } from "@/lib/services/admin";
import { NoAccess } from "@/components/admin/ui";
import { CouriersManager } from "./couriers-manager";

export const metadata = { title: "Couriers" };
export const instant = false;

export default async function AdminCouriersPage() {
  await connection();
  const { allowed } = await requireStaffPage("/admin/delivery/couriers", "delivery:manage");
  if (!allowed) return <NoAccess what="couriers" />;
  const couriers = await listCouriers(true);
  return <CouriersManager couriers={couriers} />;
}
