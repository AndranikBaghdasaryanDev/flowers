import { ok, route } from "@/lib/api/handler";
import { availableSchedule, listActiveDeliveryMethods } from "@/lib/services/delivery";
import { getSettings } from "@/lib/services/settings";

/** Active delivery/pickup methods with the dates and time windows currently bookable. */
export const GET = route(async () => {
  const settings = await getSettings();
  const now = new Date();
  const methods = await listActiveDeliveryMethods();
  return ok({
    timeZone: settings.timeZone,
    currency: settings.currency,
    payment: { cashOnDelivery: settings.checkout.cashOnDelivery, cashOnPickup: settings.checkout.cashOnPickup },
    guestCheckout: settings.checkout.guestCheckout,
    orderNotice: settings.checkout.orderNotice,
    methods: methods.map((m) => ({ ...m, schedule: availableSchedule(m, now, settings.timeZone) })),
  });
});
