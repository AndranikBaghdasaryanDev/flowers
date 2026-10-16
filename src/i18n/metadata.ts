import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/config";

/** Canonical + hreflang alternates for a storefront path (path without locale, e.g. "/shop"). */
export function localeAlternates(path: string, locale: Locale) {
  const suffix = path === "/" ? "" : path;
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = `/${l}${suffix}`;
  languages["x-default"] = `/${DEFAULT_LOCALE}${suffix}`;
  return { canonical: `/${locale}${suffix}`, languages };
}
