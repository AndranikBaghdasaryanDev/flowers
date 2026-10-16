import Link from "next/link";
import { ChevronRight, Truck, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/components/store/status-tone";
import { formatMoney } from "@/lib/domain/money";
import { orderStatusLabel } from "@/lib/domain/orders";
import { formatDateKey } from "@/lib/domain/time";
import type { OrderListItemDTO } from "@/lib/types";

export function OrderList({ orders }: { orders: OrderListItemDTO[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-[1.5rem] border border-line bg-paper">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/account/orders/${o.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-cream/60 sm:px-6">
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand sm:flex">
              {o.fulfillmentType === "pickup" ? <Store className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-ink">{o.orderNumber}</span>
                <Badge tone={statusTone(o.status)}>{orderStatusLabel(o.status, o.fulfillmentType)}</Badge>
              </span>
              <span className="mt-1 block text-[13px] text-ink-muted">
                {o.itemCount} {o.itemCount === 1 ? "item" : "items"} · {o.fulfillmentType === "pickup" ? "Pickup" : "Delivery"} {formatDateKey(o.deliveryDate, { day: "numeric", month: "short" })}
              </span>
            </span>
            <span className="text-right font-semibold tabular text-ink">{formatMoney(o.total, o.currency)}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
