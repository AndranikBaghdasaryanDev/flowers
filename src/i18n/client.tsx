"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, type ComponentProps, type ReactNode } from "react";
import { localizePath, type Locale } from "@/i18n/config";
import { createFormatter, type Formatter } from "@/i18n/format";
import { createTranslator, type Translator } from "@/i18n/translate";
import type { Messages } from "@/i18n/messages";

type I18nValue = { locale: Locale; t: Translator<Messages>; f: Formatter; localized: boolean };

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Provides the active locale and its dictionary to client components.
 * `localized` is true on the storefront (locale-prefixed URLs) and false in the admin.
 */
export function I18nProvider({
  locale,
  messages,
  localized = true,
  children,
}: {
  locale: Locale;
  messages: Partial<Messages>;
  localized?: boolean;
  children: ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({ locale, t: createTranslator(locale, messages as Messages), f: createFormatter(locale), localized }),
    [locale, messages, localized],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used inside I18nProvider");
  return ctx;
}

export const useT = () => useI18n().t;
export const useFormat = () => useI18n().f;
export const useLocale = () => useI18n().locale;

/** Returns a function that prefixes internal storefront paths with the active locale. */
export function useLocalizePath() {
  const { locale, localized } = useI18n();
  return (path: string) => (localized ? localizePath(path, locale) : path);
}

/** Router whose push/replace keep the active locale. */
export function useLocalizedRouter() {
  const router = useRouter();
  const lp = useLocalizePath();
  return useMemo(
    () => ({
      ...router,
      push: (href: string, opts?: Parameters<typeof router.push>[1]) => router.push(lp(href), opts),
      replace: (href: string, opts?: Parameters<typeof router.replace>[1]) => router.replace(lp(href), opts),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lp is derived from stable context values
    [router],
  );
}

/** Drop-in replacement for next/link that keeps the visitor's language. */
export function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const lp = useLocalizePath();
  return <NextLink href={typeof href === "string" ? lp(href) : href} {...props} />;
}
