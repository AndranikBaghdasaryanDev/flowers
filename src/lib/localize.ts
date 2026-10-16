/**
 * Localised catalogue content. Records keep English in their base fields and optional
 * Armenian / Russian overrides in `i18n`; a missing or blank override falls back to English.
 */
import type { Locale } from "@/i18n/config";
import type { I18nOverrides } from "@/lib/models/_util";

/** The override block for a locale (empty for English or when nothing is translated). */
export function overridesFor<T>(i18n: I18nOverrides<T> | null | undefined, locale: Locale | undefined): Partial<T> {
  if (!i18n || !locale || locale === "en") return {};
  return i18n[locale] ?? {};
}

/** Translated text when present, otherwise the base (English) value. */
export function pickText(override: string | null | undefined, base: string): string {
  return typeof override === "string" && override.trim() ? override : base;
}

/** Translated list when it has entries, otherwise the base list. */
export function pickList(override: string[] | null | undefined, base: string[]): string[] {
  return override && override.some((v) => v.trim()) ? override : base;
}

/** Item `index` of a translated list aligned with a base list, falling back to the base item. */
export function pickAt(override: string[] | null | undefined, index: number, base: string): string {
  return pickText(override?.[index], base);
}

/** Every non-blank translation of one field, e.g. all names of a delivery area. */
export function allTranslations<T>(i18n: I18nOverrides<T> | null | undefined, read: (block: Partial<T>) => string | undefined): string[] {
  if (!i18n) return [];
  return [i18n.hy, i18n.ru].map((b) => (b ? read(b) : undefined)).filter((v): v is string => Boolean(v?.trim()));
}

/** `$set` paths for the overrides that were submitted, e.g. { "i18n.hy.heroTitle": "…" }. */
export function i18nSetPaths<T extends object>(i18n: I18nOverrides<T> | undefined): Record<string, unknown> {
  const set: Record<string, unknown> = {};
  if (!i18n) return set;
  for (const locale of ["hy", "ru"] as const) {
    const block = i18n[locale];
    if (!block) continue;
    for (const [field, value] of Object.entries(block)) if (value !== undefined) set[`i18n.${locale}.${field}`] = value;
  }
  return set;
}
