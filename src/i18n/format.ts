import { INTL_TAG, type Locale } from "@/i18n/config";
import { formatMoney, type CurrencyCode } from "@/lib/domain/money";
import { formatDateKey, formatDateTime } from "@/lib/domain/time";

/**
 * Locale-aware formatting. The business currency never changes with the language;
 * only number grouping, date wording and similar conventions follow the locale.
 */
export function createFormatter(locale: Locale) {
  const tag = INTL_TAG[locale];
  return {
    tag,
    money: (minor: number, currency: CurrencyCode) => formatMoney(minor, currency, tag),
    number: (n: number) => new Intl.NumberFormat(tag).format(n),
    dateKey: (dateKey: string, opts?: Intl.DateTimeFormatOptions) => formatDateKey(dateKey, opts, tag),
    dateTime: (date: Date | string, timeZone: string, opts?: Intl.DateTimeFormatOptions) => formatDateTime(date, timeZone, opts, tag),
    /** Date in the viewer's own zone (for already-localised timestamps). */
    date: (date: Date | string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) => new Intl.DateTimeFormat(tag, opts).format(new Date(date)),
  };
}

export type Formatter = ReturnType<typeof createFormatter>;
