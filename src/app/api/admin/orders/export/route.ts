import { readQuery, requirePermission, route } from "@/lib/api/handler";
import { orderListQuerySchema } from "@/lib/validation";
import { exportOrdersAdmin } from "@/lib/services/orders";
import { loadSettings } from "@/lib/services/settings";
import { csvResponse, toCsv } from "@/lib/csv";
import { toMajor, type CurrencyCode } from "@/lib/domain/money";
import { formatDateTime } from "@/lib/domain/time";
import { PAYMENT_METHOD_LABELS, ORDER_STATUS_LABELS } from "@/lib/domain/orders";
import { hasPermission } from "@/lib/domain/roles";

/** CSV export of the currently filtered orders. Customer contact columns require customers:read. */
export const GET = route(async (req) => {
  const user = await requirePermission("orders:read");
  const query = readQuery(req, orderListQuerySchema);
  const [orders, settings] = await Promise.all([exportOrdersAdmin(query), loadSettings()]);
  const withContacts = hasPermission(user.role, "customers:read");
  const headers = [
    "Order", "Placed", "Status", "Payment status", "Payment method", "Fulfilment", "Method", "Delivery date", "Time window",
    "Customer", ...(withContacts ? ["Phone", "Email"] : []), "Area", "Items", "Units", "Subtotal", "Delivery fee", "Discount", "Total", "Currency", "Courier",
  ];
  const rows = orders.map((o) => {
    const c = o.currency as CurrencyCode;
    return [
      o.orderNumber,
      formatDateTime(o.createdAt, settings.timeZone, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
      ORDER_STATUS_LABELS[o.status],
      o.paymentStatus,
      PAYMENT_METHOD_LABELS[o.paymentMethod],
      o.fulfillment.kind,
      o.fulfillment.methodName,
      o.deliveryDate,
      o.timeWindow?.label ?? "",
      o.customer.name,
      ...(withContacts ? [o.customer.phone, o.customer.email] : []),
      o.address?.zone ?? "",
      o.items.map((i) => `${i.quantity}× ${i.name}`).join("; "),
      o.items.reduce((n, i) => n + i.quantity, 0),
      toMajor(o.subtotal, c),
      toMajor(o.deliveryFee, c),
      toMajor(o.discountTotal ?? 0, c),
      toMajor(o.total, c),
      c,
      o.delivery?.courierName ?? "",
    ];
  });
  return csvResponse(`floriani-orders-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows));
});
