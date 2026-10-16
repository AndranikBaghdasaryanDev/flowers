"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Panel } from "@/components/admin/ui";
import { useT } from "@/i18n/client";
import { LOCALE_NAMES } from "@/i18n/config";
import type { ContentLocale, I18nOverrides } from "@/lib/models/_util";
import { cn } from "@/lib/cn";

/** Languages that can be translated in the admin; English lives in the base fields. */
const TRANSLATED: readonly ContentLocale[] = ["hy", "ru"];
type Tab = "en" | ContentLocale;
const TABS: readonly Tab[] = ["en", ...TRANSLATED];

type Value = string | string[];

/** One translatable field as rendered in the Armenian / Russian tabs. */
export type TranslationField = {
  /** Path inside the locale block, e.g. "name" or "imageAlts.2"; also used to find server errors. */
  key: string;
  label: string;
  /** The English text, shown as placeholder and hint. */
  base: Value;
  get: (locale: ContentLocale) => Value | undefined;
  set: (locale: ContentLocale, value: Value) => void;
  /** Renders a textarea with this many rows. */
  rows?: number;
  maxLength?: number;
  /** Optional heading the field is grouped under. */
  group?: string;
  /** Hint shown when the English text is empty (defaults to "No English text yet"). */
  emptyHint?: string;
};

const blank = (v: Value | undefined) => (Array.isArray(v) ? !v.some((s) => s.trim()) : !v?.trim());

/** Fields whose English text exists but whose translation is still empty. */
export function missingTranslations(fields: TranslationField[], locale: ContentLocale): number {
  return fields.filter((f) => !blank(f.base) && blank(f.get(locale))).length;
}

/** A copy of `i18n` with one field of one language replaced. */
export function withOverride<T extends object, K extends keyof T>(i18n: I18nOverrides<T>, locale: ContentLocale, key: K, value: T[K]): I18nOverrides<T> {
  return { ...i18n, [locale]: { ...i18n[locale], [key]: value } };
}

type Update<T> = (fn: (prev: I18nOverrides<T>) => I18nOverrides<T>) => void;
type TextSpec<T> = { key: keyof T & string; label: string; base: Value; rows?: number; maxLength?: number; group?: string; emptyHint?: string };

/** Field descriptors for plain text / list fields of an `I18nOverrides` value. */
export function translationFields<T extends object>(i18n: I18nOverrides<T>, update: Update<T>, specs: TextSpec<T>[]): TranslationField[] {
  return specs.map((s) => ({
    ...s,
    get: (locale) => i18n[locale]?.[s.key] as Value | undefined,
    set: (locale, value) => update((prev) => withOverride(prev, locale, s.key, value as T[typeof s.key])),
  }));
}

/**
 * Field descriptors for a list translated item by item and aligned with a base list by
 * position (image alt texts, delivery area names). Saved arrays always match `items` in length.
 */
export function positionalFields<T extends object>(
  i18n: I18nOverrides<T>,
  update: Update<T>,
  key: keyof T & string,
  items: { label: string; base: string }[],
  opts: { maxLength?: number; group?: string } = {},
): TranslationField[] {
  const read = (block: Partial<T> | undefined) => (block?.[key] as string[] | undefined) ?? [];
  return items.map((item, index) => ({
    key: `${key}.${index}`,
    label: item.label,
    base: item.base,
    maxLength: opts.maxLength,
    group: opts.group,
    get: (locale) => read(i18n[locale])[index],
    set: (locale, value) =>
      update((prev) => {
        const next = items.map((_, i) => read(prev[locale])[i] ?? "");
        next[index] = String(value);
        return withOverride(prev, locale, key, next as T[typeof key]);
      }),
  }));
}

/** The overrides of only `keys`, so a form saves just the translations it edits. */
export function pickOverrides<T extends object, K extends keyof T>(i18n: I18nOverrides<T>, keys: readonly K[]): I18nOverrides<Pick<T, K>> {
  const pick = (block: Partial<T> | undefined) => (block ? (Object.fromEntries(keys.filter((k) => block[k] !== undefined).map((k) => [k, block[k]])) as Partial<Pick<T, K>>) : undefined);
  return { hy: pick(i18n.hy), ru: pick(i18n.ru) };
}

/** Drops empty list entries before saving (positional lists must keep theirs, so only use for free lists). */
export const cleanList = (list: string[] | undefined) => list?.map((s) => s.trim()).filter(Boolean);

/**
 * Language tabs for editing a record: the English (base) form plus Armenian and Russian
 * translations of its text fields. Untranslated fields show the English text as a hint and
 * fall back to it on the storefront. All panels stay mounted so in-progress input survives tab switches.
 */
export function TranslationTabs({
  fields,
  children,
  errors,
  asPanels,
  className,
}: {
  fields: TranslationField[];
  /** The English form. */
  children: ReactNode;
  /** Server field errors, keyed like "i18n.hy.name". */
  errors?: Record<string, string>;
  /** Wrap each field group of the translated tabs in a `Panel` (full-page forms). */
  asPanels?: boolean;
  className?: string;
}) {
  const t = useT();
  const uid = useId();
  const [active, setActive] = useState<Tab>("en");
  const refs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  const errorFor = (locale: ContentLocale, key: string) => {
    if (!errors) return undefined;
    const path = `i18n.${locale}.${key}`;
    return errors[path] ?? Object.entries(errors).find(([k]) => k.startsWith(`${path}.`))?.[1];
  };
  const tabHasErrors = (tab: Tab) => Boolean(errors && Object.keys(errors).some((k) => (tab === "en" ? !k.startsWith("i18n.") : k.startsWith(`i18n.${tab}.`))));

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = TABS.indexOf(active);
    const next =
      e.key === "ArrowRight" ? TABS[(i + 1) % TABS.length]
      : e.key === "ArrowLeft" ? TABS[(i - 1 + TABS.length) % TABS.length]
      : e.key === "Home" ? TABS[0]
      : e.key === "End" ? TABS[TABS.length - 1]
      : null;
    if (!next) return;
    e.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  };

  const groups = [...new Set(fields.map((f) => f.group))];

  const renderField = (locale: ContentLocale, f: TranslationField) => {
    const id = `${uid}-${locale}-${f.key.replace(/\W/g, "-")}`;
    const isList = Array.isArray(f.base);
    const baseText = isList ? (f.base as string[]).join(", ") : (f.base as string);
    const value = f.get(locale);
    const error = errorFor(locale, f.key);
    const hint = baseText.trim()
      ? t("admin.i18n.englishValue", { text: baseText.length > 160 ? `${baseText.slice(0, 160)}…` : baseText })
      : (f.emptyHint ?? t("admin.i18n.noEnglish"));
    const common = { id, lang: locale, maxLength: f.maxLength, invalid: !!error, "aria-describedby": error ? `${id}-error` : `${id}-hint` };
    return (
      <Field key={f.key} id={id} label={f.label} optional hint={isList ? `${hint} · ${t("admin.i18n.onePerLine")}` : hint} error={error}>
        {isList ? (
          <Textarea
            {...common}
            maxLength={undefined}
            rows={Math.max(3, (f.base as string[]).length)}
            placeholder={(f.base as string[]).join("\n")}
            value={((value as string[] | undefined) ?? []).join("\n")}
            onChange={(e) => f.set(locale, e.target.value.split("\n"))}
          />
        ) : f.rows ? (
          <Textarea {...common} rows={f.rows} placeholder={baseText} value={(value as string | undefined) ?? ""} onChange={(e) => f.set(locale, e.target.value)} />
        ) : (
          <Input {...common} placeholder={baseText} value={(value as string | undefined) ?? ""} onChange={(e) => f.set(locale, e.target.value)} />
        )}
      </Field>
    );
  };

  const renderLocale = (locale: ContentLocale) => {
    const note = <p className="rounded-xl bg-cream px-3 py-2 text-[13px] text-ink-muted">{t("admin.i18n.fallbackNote")}</p>;
    if (asPanels) {
      return (
        <div className="space-y-6">
          {note}
          {groups.map((g) => (
            <Panel key={g ?? ""} title={g}>
              <div className="grid gap-4">{fields.filter((f) => f.group === g).map((f) => renderField(locale, f))}</div>
            </Panel>
          ))}
        </div>
      );
    }
    return (
      <div className="grid gap-4">
        {note}
        {groups.map((g) => (
          <div key={g ?? ""} className="grid gap-4">
            {g && <h3 className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">{g}</h3>}
            {fields.filter((f) => f.group === g).map((f) => renderField(locale, f))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={className}>
      <div role="tablist" aria-label={t("admin.i18n.languages")} className="mb-4 flex flex-wrap gap-1 rounded-xl border border-line bg-cream/60 p-1">
        {TABS.map((tab) => {
          const selected = active === tab;
          const missing = tab === "en" ? 0 : missingTranslations(fields, tab);
          const hasErrors = tabHasErrors(tab);
          return (
            <button
              key={tab}
              ref={(el) => {
                refs.current[tab] = el;
              }}
              type="button"
              role="tab"
              id={`${uid}-tab-${tab}`}
              aria-selected={selected}
              aria-controls={`${uid}-panel-${tab}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab)}
              onKeyDown={onKeyDown}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20",
                selected ? "bg-paper text-ink shadow-sm" : "text-ink-soft hover:text-ink",
              )}
            >
              <span lang={tab}>{tab === "en" ? t("admin.i18n.englishBase") : LOCALE_NAMES[tab]}</span>
              {hasErrors ? (
                <span className="rounded-full bg-danger-50 px-1.5 text-[11px] font-bold text-danger ring-1 ring-inset ring-danger/20">
                  !<span className="sr-only"> {t("admin.i18n.hasErrors")}</span>
                </span>
              ) : missing > 0 ? (
                <span title={t("admin.i18n.missingCount", { count: missing })} className="rounded-full bg-warning-50 px-1.5 text-[11px] font-bold tabular text-warning ring-1 ring-inset ring-warning/20">
                  <span aria-hidden="true">{missing}</span>
                  <span className="sr-only">{t("admin.i18n.missingCount", { count: missing })}</span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {TABS.map((tab) => (
        <div key={tab} role="tabpanel" id={`${uid}-panel-${tab}`} aria-labelledby={`${uid}-tab-${tab}`} hidden={active !== tab} tabIndex={0} className="focus-visible:outline-none">
          {tab === "en" ? children : renderLocale(tab)}
        </div>
      ))}
    </div>
  );
}
