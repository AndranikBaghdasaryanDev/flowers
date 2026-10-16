import { readQuery, requirePermission, route } from "@/lib/api/handler";
import { orderListQuerySchema } from "@/lib/validation";
import { exportOrdersAdmin } from "@/lib/services/orders";
import { loadSettings } from "@/lib/services/settings";
import { csvResponse, toCsv } from "@/lib/csv";
import { toMajor, type CurrencyCode } from "@/lib/domain/money";
import { formatDateTime } from "@/lib/domain/time";
import { hasPermission } from "@/lib/domain/roles";
import { getAdminLocale, translatorFor } from "@/i18n/server";
import { paymentMethodLabel, paymentStatusLabel, statusLabel } from "@/i18n/labels";

/** CSV export of the currently filtered orders. Customer contact columns require customers:read. */
export const GET = route(async (req) => {
  const user = await requirePermission("orders:read");
  const query = readQuery(req, orderListQuerySchema);
  const [orders, settings] = await Promise.all([exportOrdersAdmin(query), loadSettings()]);
  const withContacts = hasPermission(user.role, "customers:read");
  const t = translatorFor(await getAdminLocale());
  const headers = [
    t("admin.orders.csv.order"), t("admin.orders.csv.placed"), t("admin.orders.csv.status"), t("admin.orders.csv.paymentStatus"), t("admin.orders.csv.paymentMethod"),
    t("admin.orders.csv.fulfilment"), t("admin.orders.csv.method"), t("admin.orders.csv.deliveryDate"), t("admin.orders.csv.timeWindow"),
    t("admin.orders.csv.customer"), ...(withContacts ? [t("admin.orders.csv.phone"), t("admin.orders.csv.email")] : []), t("admin.orders.csv.area"),
    t("admin.orders.csv.items"), t("admin.orders.csv.units"), t("admin.orders.csv.subtotal"), t("admin.orders.csv.deliveryFee"), t("admin.orders.csv.discount"),
    t("admin.orders.csv.total"), t("admin.orders.csv.currency"), t("admin.orders.csv.courier"),
  ];
  const rows = orders.map((o) => {
    const c = o.currency as CurrencyCode;
    return [
      o.orderNumber,
      formatDateTime(o.createdAt, settings.timeZone, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
      statusLabel(t, o.status),
      paymentStatusLabel(t, o.paymentStatus),
      paymentMethodLabel(t, o.paymentMethod),
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
