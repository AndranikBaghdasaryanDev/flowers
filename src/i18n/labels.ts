import type { FulfillmentType, OrderStatus, PaymentMethod, PaymentStatus, VehicleType } from "@/lib/domain/orders";
import type { Translator } from "@/i18n/translate";
import type { Messages } from "@/i18n/messages";

type T = Translator<Messages>;

/** Status wording depends on fulfilment: "ready" means ready for pickup or for dispatch. */
export function statusLabel(t: T, status: OrderStatus, fulfillment?: FulfillmentType): string {
  if (status === "ready") {
    return fulfillment === "pickup" ? t("orderStatus.readyPickup") : fulfillment === "delivery" ? t("orderStatus.readyDispatch") : t("orderStatus.ready");
  }
  if (status === "completed" && fulfillment === "pickup") return t("orderStatus.pickedUp");
  return t(`orderStatus.${status}`);
}

export const paymentStatusLabel = (t: T, s: PaymentStatus) => t(`paymentStatus.${s}`);
export const paymentMethodLabel = (t: T, m: PaymentMethod) => t(`paymentMethod.${m}`);
/** "other" is a reserved word in dictionaries (plural forms), so that vehicle uses its own key. */
export const vehicleLabel = (t: T, v: VehicleType) => (v === "other" ? t("vehicle.otherType") : t(`vehicle.${v}`));

