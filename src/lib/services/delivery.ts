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
import { allTranslations, overridesFor, pickAt, pickText } from "@/lib/localize";
import type { Locale } from "@/i18n/config";

const uniq = (values: string[]) => [...new Set(values.filter(Boolean))];

/**
 * DTO for a delivery method. With a locale, names and texts are translated (falling back to
 * English); zone and city names always carry `aliases` in every language so that a name chosen
 * in any language matches at checkout.
 */
export function deliveryMethodToDto(m: DeliveryMethodDoc, locale?: Locale): DeliveryMethodDTO {
  const tr = overridesFor(m.i18n, locale);
  const city = m.city ?? "";
  const cityAliases = uniq([city, ...allTranslations(m.i18n, (b) => b.city)]);
  return {
    id: String(m._id),
    name: pickText(tr.name, m.name),
    type: m.type as DeliveryMethodDTO["type"],
    description: pickText(tr.description, m.description ?? ""),
    fee: m.fee ?? 0,
    freeOverAmount: m.freeOverAmount ?? null,
    minOrderAmount: m.minOrderAmount ?? 0,
    zones: (m.zones ?? []).map((z, i) => {
      const aliases = uniq([z.name, ...allTranslations(m.i18n, (b) => b.zones?.[i])]);
      return { name: pickAt(tr.zones, i, z.name), fee: z.fee ?? null, ...(aliases.length > 1 ? { aliases } : {}) };
    }),
    city: city ? pickText(tr.city, city) : "",
    ...(cityAliases.length > 1 ? { cityAliases } : {}),
    estimatedTime: pickText(tr.estimatedTime, m.estimatedTime ?? ""),
    leadTimeMinutes: m.leadTimeMinutes ?? 0,
    maxDaysAhead: m.maxDaysAhead ?? 30,
    availableWeekdays: m.availableWeekdays ?? [0, 1, 2, 3, 4, 5, 6],
    timeWindows: (m.timeWindows ?? []).map((w) => ({ label: w.label, start: w.start, end: w.end })),
    requiresCourier: Boolean(m.requiresCourier),
    pickupAddress: pickText(tr.pickupAddress, m.pickupAddress ?? ""),
  };
}

export async function listActiveDeliveryMethods(locale?: Locale): Promise<DeliveryMethodDTO[]> {
  await connectDb();
  const docs = await DeliveryMethod.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean<DeliveryMethodDoc[]>();
  return docs.map((d) => deliveryMethodToDto(d, locale));
}

export async function getActiveDeliveryMethod(id: string, locale?: Locale): Promise<DeliveryMethodDTO | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDb();
  const doc = await DeliveryMethod.findOne({ _id: id, isActive: true }).lean<DeliveryMethodDoc>();
  return doc ? deliveryMethodToDto(doc, locale) : null;
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The method's zone for an area name given in any language. */
export function findZone(method: DeliveryMethodDTO, zone: string | undefined) {
  if (!zone) return undefined;
  return method.zones.find((z) => sameName(z.name, zone) || (z.aliases ?? []).some((a) => sameName(a, zone)));
}

/** Whether a city name (in any language) is the method's delivery city. */
export function isMethodCity(method: DeliveryMethodDTO, city: string): boolean {
  return [method.city, ...(method.cityAliases ?? [])].some((c) => sameName(c, city));
}

/** Fulfilment fee for a subtotal and (optional) zone. Returns null when the zone is not covered. */
export function computeDeliveryFee(method: DeliveryMethodDTO, subtotal: number, zone?: string): number | null {
  let fee = method.fee;
  if (method.zones.length > 0) {
    const match = findZone(method, zone);
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
          ? "server.schedule.pickupDate"
          : "server.schedule.deliveryDate",
    };
  }
  if (method.timeWindows.length === 0) return { ok: true, window: null };
  if (!windowLabel) return { ok: false, field: "timeWindow", reason: "server.schedule.chooseWindow" };
  if (!day.windows.includes(windowLabel)) {
    return { ok: false, field: "timeWindow", reason: "server.schedule.windowGone" };
  }
  const w = method.timeWindows.find((tw) => tw.label === windowLabel)!;
  return { ok: true, window: { label: w.label, start: w.start, end: w.end } };
}
