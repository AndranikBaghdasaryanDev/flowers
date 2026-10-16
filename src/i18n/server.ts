import "server-only";
import { cookies, headers } from "next/headers";
import { locale as rootLocale } from "next/root-params";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, negotiateLocale, type Locale } from "@/i18n/config";
import { createFormatter } from "@/i18n/format";
import { createTranslator } from "@/i18n/translate";
import { messages, type Messages } from "@/i18n/messages";

/** Locale of the current storefront route (the `[locale]` root segment). */
export async function getStoreLocale(): Promise<Locale> {
  const value = await rootLocale();
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Translator + formatter for storefront Server Components. */
export async function getStoreI18n() {
  const locale = await getStoreLocale();
  return { locale, t: createTranslator(locale, messages[locale], messages.en), f: createFormatter(locale) };
}

/** Admin language: saved cookie, otherwise the browser's preference. */
export async function getAdminLocale(): Promise<Locale> {
  const jar = await cookies();
  const saved = jar.get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return negotiateLocale((await headers()).get("accept-language"));
}

export async function getAdminI18n() {
  const locale = await getAdminLocale();
  return { locale, t: createTranslator(locale, messages[locale], messages.en), f: createFormatter(locale) };
}

/**
 * Locale of an API request: explicit X-Locale header (sent by the app's fetch helper),
 * then the saved cookie, then Accept-Language.
 */
export async function getRequestLocale(): Promise<Locale> {
  const h = await headers();
  const explicit = h.get("x-locale");
  if (isLocale(explicit)) return explicit;
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return negotiateLocale(h.get("accept-language"));
}

export function translatorFor(locale: Locale) {
  return createTranslator<Messages>(locale, messages[locale], messages.en);
}
