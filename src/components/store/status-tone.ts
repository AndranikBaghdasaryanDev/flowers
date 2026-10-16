import type { BadgeTone } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/domain/orders";

/** Badge tone per order status, shared by storefront and admin. */
export function statusTone(status: OrderStatus): BadgeTone {
  if (status === "cancelled") return "danger";
  if (status === "delivery_failed") return "warning";
  if (status === "delivered" || status === "completed") return "success";
  if (status === "pending") return "neutral";
  return "brand";
}
