/** Supported languages. Armenian is the default for the Yerevan-based business. */
export const LOCALES = ["hy", "en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "hy";

/** Remembers the visitor's choice; also used by the admin panel and the API. */
export const LOCALE_COOKIE = "ff_locale";

export const LOCALE_NAMES: Record<Locale, string> = {
  hy: "Հայերեն",
  en: "English",
  ru: "Русский",
};

export const LOCALE_SHORT: Record<Locale, string> = { hy: "ՀԱՅ", en: "ENG", ru: "РУС" };

/** BCP 47 tags used for Intl formatting and <html lang>. */
export const INTL_TAG: Record<Locale, string> = {
  hy: "hy-AM",
  en: "en-GB",
  ru: "ru-RU",
};

/** Open Graph locale codes. */
export const OG_LOCALE: Record<Locale, string> = { hy: "hy_AM", en: "en_US", ru: "ru_RU" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Picks the best supported locale from an Accept-Language header. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { lang } of ranked) if (isLocale(lang)) return lang;
  return DEFAULT_LOCALE;
}

/** Paths that are never locale-prefixed. */
export function isUnlocalizedPath(pathname: string): boolean {
  return /^\/(api|admin|_next|brand)(\/|$)/.test(pathname) || /\.[a-z0-9]+$/i.test(pathname);
}

/** Prefixes an internal path with the locale, leaving external/unlocalized links alone. */
export function localizePath(path: string, locale: Locale): string {
  if (!path.startsWith("/") || path.startsWith("//") || isUnlocalizedPath(path.split(/[?#]/)[0])) return path;
  const first = path.split(/[/?#]/)[1];
  if (isLocale(first)) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** Removes a leading locale segment: "/hy/shop?x" → "/shop?x". */
export function stripLocale(path: string): string {
  const m = path.match(/^\/(hy|en|ru)(?=\/|\?|#|$)/);
  if (!m) return path;
  const rest = path.slice(m[0].length);
  return rest.startsWith("/") ? rest : `/${rest}`.replace(/^\/(?=[?#])/, "/");
}
