/**
 * Time-zone aware helpers. Timestamps are always stored in UTC; business days
 * (analytics, delivery dates, "today" filters) are evaluated in the store time zone.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** Offset in minutes of `timeZone` from UTC at the instant `date`. */
export function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** YYYY-MM-DD of the instant `date` in `timeZone`. */
export function toDateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** The UTC instant at which local wall-clock `dateKey hh:mm` occurs in `timeZone`. */
export function zonedWallTimeToUtc(dateKey: string, time: string, timeZone: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes handle DST transitions correctly.
  let offset = timeZoneOffsetMinutes(new Date(guess), timeZone);
  let utc = guess - offset * 60000;
  const offset2 = timeZoneOffsetMinutes(new Date(utc), timeZone);
  if (offset2 !== offset) {
    offset = offset2;
    utc = guess - offset * 60000;
  }
  return new Date(utc);
}

/** Start of the local day `dateKey` in `timeZone`, as a UTC Date. */
export function startOfZonedDay(dateKey: string, timeZone: string): Date {
  return zonedWallTimeToUtc(dateKey, "00:00", timeZone);
}

export function addDaysToKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Inclusive list of day keys between from and to. */
export function eachDayKey(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard < 1000) {
    out.push(cur);
    cur = addDaysToKey(cur, 1);
    guard++;
  }
  return out;
}

/** Half-open UTC range [start, end) covering local days from..to inclusive. */
export function zonedDayRange(from: string, to: string, timeZone: string): { start: Date; end: Date } {
  return { start: startOfZonedDay(from, timeZone), end: startOfZonedDay(addDaysToKey(to, 1), timeZone) };
}

/** 0 = Sunday … 6 = Saturday for a date key (calendar weekday, zone-independent). */
export function weekdayOfKey(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function formatDateKey(dateKey: string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }, intlTag = "en-GB"): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat(intlTag, { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatDateTime(date: Date | string, timeZone: string, opts?: Intl.DateTimeFormatOptions, intlTag = "en-GB"): string {
  return new Intl.DateTimeFormat(intlTag, {
    timeZone,
    ...(opts ?? { dateStyle: "medium", timeStyle: "short" }),
  }).format(new Date(date));
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** "HH:MM" → minutes after midnight */
export function minutesOfTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
