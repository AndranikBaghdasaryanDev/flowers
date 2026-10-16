import "server-only";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { DeliveryMethod, type DeliveryMethodDoc } from "@/lib/models/delivery";
import type { DeliveryMethodDTO } from "@/lib/types";
import {
  addDaysToKey,
  minutesOfTime,
  toDateKey,
  weekdayOfKey,
  zonedWallTimeToUtc,
} from "@/lib/domain/time";
import type { PaymentMethod } from "@/lib/domain/orders";
import type { StoreSettings } from "@/lib/services/settings";

export function deliveryMethodToDto(m: DeliveryMethodDoc): DeliveryMethodDTO {
  return {
    id: String(m._id),
    name: m.name,
    type: m.type as DeliveryMethodDTO["type"],
    description: m.description ?? "",
    fee: m.fee ?? 0,
    freeOverAmount: m.freeOverAmount ?? null,
    minOrderAmount: m.minOrderAmount ?? 0,
    zones: (m.zones ?? []).map((z) => ({ name: z.name, fee: z.fee ?? null })),
    city: m.city ?? "",
    estimatedTime: m.estimatedTime ?? "",
    leadTimeMinutes: m.leadTimeMinutes ?? 0,
    maxDaysAhead: m.maxDaysAhead ?? 30,
    availableWeekdays: m.availableWeekdays ?? [0, 1, 2, 3, 4, 5, 6],
    timeWindows: (m.timeWindows ?? []).map((w) => ({ label: w.label, start: w.start, end: w.end })),
    requiresCourier: Boolean(m.requiresCourier),
    pickupAddress: m.pickupAddress ?? "",
  };
}

export async function listActiveDeliveryMethods(): Promise<DeliveryMethodDTO[]> {
  await connectDb();
  const docs = await DeliveryMethod.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean<DeliveryMethodDoc[]>();
  return docs.map(deliveryMethodToDto);
}

export async function getActiveDeliveryMethod(id: string): Promise<DeliveryMethodDTO | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDb();
  const doc = await DeliveryMethod.findOne({ _id: id, isActive: true }).lean<DeliveryMethodDoc>();
  return doc ? deliveryMethodToDto(doc) : null;
}

/** Fulfilment fee for a subtotal and (optional) zone. Returns null when the zone is not covered. */
export function computeDeliveryFee(method: DeliveryMethodDTO, subtotal: number, zone?: string): number | null {
  let fee = method.fee;
  if (method.zones.length > 0) {
    if (!zone) return null;
    const match = method.zones.find((z) => z.name.toLowerCase() === zone.trim().toLowerCase());
    if (!match) return null;
    if (match.fee !== null) fee = match.fee;
  }
  if (method.freeOverAmount !== null && subtotal >= method.freeOverAmount) return 0;
  return fee;
}

export function paymentMethodFor(method: DeliveryMethodDTO): PaymentMethod {
  return method.type === "pickup" ? "cash_on_pickup" : "cash_on_delivery";
}

export function isPaymentMethodEnabled(pm: PaymentMethod, settings: StoreSettings): boolean {
  return pm === "cash_on_delivery" ? settings.checkout.cashOnDelivery : settings.checkout.cashOnPickup;
}

export type ScheduleDay = { date: string; windows: string[] };

/** Dates (and time windows) on which the method can fulfil an order placed at `now`. */
export function availableSchedule(method: DeliveryMethodDTO, now: Date, timeZone: string): ScheduleDay[] {
  const earliest = new Date(now.getTime() + method.leadTimeMinutes * 60000);
  const today = toDateKey(now, timeZone);
  const earliestKey = toDateKey(earliest, timeZone);
  const days: ScheduleDay[] = [];
  for (let i = 0; i <= method.maxDaysAhead; i++) {
    const date = addDaysToKey(today, i);
    if (!method.availableWeekdays.includes(weekdayOfKey(date))) continue;
    if (method.timeWindows.length === 0) {
      if (date >= earliestKey) days.push({ date, windows: [] });
      continue;
    }
    const windows = method.timeWindows
      .filter((w) => zonedWallTimeToUtc(date, w.end, timeZone).getTime() >= earliest.getTime())
      .sort((a, b) => minutesOfTime(a.start) - minutesOfTime(b.start))
      .map((w) => w.label);
    if (windows.length > 0) days.push({ date, windows });
  }
  return days;
}

export type ScheduleCheck = { ok: true; window: { label: string; start: string; end: string } | null } | { ok: false; field: string; reason: string };

export function checkSchedule(
  method: DeliveryMethodDTO,
  date: string,
  windowLabel: string,
  now: Date,
  timeZone: string,
): ScheduleCheck {
  const schedule = availableSchedule(method, now, timeZone);
  const day = schedule.find((d) => d.date === date);
  if (!day) {
    return {
      ok: false,
      field: "deliveryDate",
      reason:
        method.type === "pickup"
          ? "Pickup is not available on the selected date. Please choose another date."
          : "Delivery is not available on the selected date. Please choose another date.",
    };
  }
  if (method.timeWindows.length === 0) return { ok: true, window: null };
  if (!windowLabel) return { ok: false, field: "timeWindow", reason: "Choose a time window." };
  if (!day.windows.includes(windowLabel)) {
    return { ok: false, field: "timeWindow", reason: "This time window is no longer available. Please choose another." };
  }
  const w = method.timeWindows.find((tw) => tw.label === windowLabel)!;
  return { ok: true, window: { label: w.label, start: w.start, end: w.end } };
}
