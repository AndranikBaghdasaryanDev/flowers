/**
 * Money is stored as integers in the currency's minor unit.
 * The currency is configured once per store (STORE_CURRENCY / store settings).
 */

export const CURRENCIES = {
  AMD: { symbol: "֏", decimals: 0, symbolAfter: true },
  USD: { symbol: "$", decimals: 2, symbolAfter: false },
  EUR: { symbol: "€", decimals: 2, symbolAfter: false },
  RUB: { symbol: "₽", decimals: 0, symbolAfter: true },
  GBP: { symbol: "£", decimals: 2, symbolAfter: false },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export function isCurrencyCode(value: string): value is CurrencyCode {
  return value in CURRENCIES;
}

export function currencyDecimals(currency: CurrencyCode): number {
  return CURRENCIES[currency].decimals;
}

/** Converts a major-unit decimal (e.g. 12.5) to integer minor units. */
export function toMinor(amount: number, currency: CurrencyCode): number {
  const factor = 10 ** currencyDecimals(currency);
  return Math.round(amount * factor);
}

/** Converts integer minor units back to a major-unit number. */
export function toMajor(minor: number, currency: CurrencyCode): number {
  return minor / 10 ** currencyDecimals(currency);
}

export function formatMoney(minor: number, currency: CurrencyCode): string {
  const def = CURRENCIES[currency];
  const major = toMajor(minor, currency);
  const number = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: def.decimals,
    maximumFractionDigits: def.decimals,
  }).format(major);
  return def.symbolAfter ? `${number} ${def.symbol}` : `${def.symbol}${number}`;
}
