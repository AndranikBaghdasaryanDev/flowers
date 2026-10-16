import { Fragment, createElement, type ReactNode } from "react";
import { INTL_TAG, type Locale } from "@/i18n/config";

/**
 * Minimal, dependency-free translator.
 * - Keys are dot paths into a typed dictionary (missing keys are compile errors in hy/ru).
 * - `{name}` placeholders are interpolated.
 * - Plural messages are objects with CLDR categories (one / few / many / other), chosen
 *   with Intl.PluralRules for the active locale and the `count` variable.
 * - `t.rich()` maps `<tag>text</tag>` segments to React nodes (links, emphasis…).
 */

export type PluralMessage = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };
type Leaf = string | PluralMessage;

/** The shape every locale must provide (strings and plural objects, same keys as English). */
export type DeepMessages<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends { other: string } ? PluralMessage : DeepMessages<T[K]>;
};

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;

/** All dot-path keys of a dictionary whose values are leaves. */
export type MessageKey<T> = {
  [K in keyof T & string]: T[K] extends string ? K : T[K] extends { other: string } ? K : Join<K, MessageKey<T[K]>>;
}[keyof T & string];

export type Vars = Record<string, string | number>;

function isPlural(node: unknown): node is PluralMessage {
  return typeof node === "object" && node !== null && "other" in node;
}

function lookup(messages: unknown, key: string): Leaf | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" || isPlural(node) ? node : undefined;
}

export function interpolate(template: string, vars?: Vars, locale?: Locale): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name];
    if (v === undefined) return "";
    return typeof v === "number" && locale ? new Intl.NumberFormat(INTL_TAG[locale]).format(v) : String(v);
  });
}

const pluralCache = new Map<Locale, Intl.PluralRules>();

export type Translator<T> = {
  (key: MessageKey<T>, vars?: Vars): string;
  rich: (key: MessageKey<T>, tags: Record<string, (chunk: string) => ReactNode>, vars?: Vars) => ReactNode;
  has: (key: string) => boolean;
  /** Translate a key computed at runtime (e.g. from a status value); falls back to `fallback`. */
  dynamic: (key: string, vars?: Vars, fallback?: string) => string;
  locale: Locale;
};

export function createTranslator<T>(locale: Locale, messages: T, fallbackMessages?: T): Translator<T>;
export function createTranslator(locale: Locale, messages: unknown, fallbackMessages?: unknown): Translator<unknown> {
  const resolve = (key: string, vars?: Vars): string | undefined => {
    const leaf = lookup(messages, key) ?? (fallbackMessages ? lookup(fallbackMessages, key) : undefined);
    if (leaf === undefined) return undefined;
    if (typeof leaf === "string") return interpolate(leaf, vars, locale);
    let rules = pluralCache.get(locale);
    if (!rules) {
      rules = new Intl.PluralRules(INTL_TAG[locale]);
      pluralCache.set(locale, rules);
    }
    const count = Number(vars?.count ?? 0);
    const category = (count === 0 && leaf.zero ? "zero" : rules.select(count)) as keyof PluralMessage;
    return interpolate(leaf[category] ?? leaf.other, vars, locale);
  };

  const missing = (key: string) => {
    if (process.env.NODE_ENV !== "production") console.warn(`[i18n] missing key "${key}" for locale "${locale}"`);
    return key;
  };

  // Implemented over plain strings; the typed key union only constrains callers.
  const rich = (key: string, tags: Record<string, (chunk: string) => ReactNode>, vars?: Vars): ReactNode => {
    const text = resolve(key, vars) ?? missing(key);
    const parts: ReactNode[] = [];
    const re = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(text))) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      const render = tags[m[1]];
      parts.push(createElement(Fragment, { key: i++ }, render ? render(m[2]) : m[2]));
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return createElement(Fragment, null, ...parts);
  };
  const t: Translator<unknown> = Object.assign((key: string, vars?: Vars) => resolve(key, vars) ?? missing(key), {
    rich,
    has: (key: string) => lookup(messages, key) !== undefined,
    dynamic: (key: string, vars?: Vars, fallback?: string) => resolve(key, vars) ?? fallback ?? missing(key),
    locale,
  });
  return t;
}
