"use client";

import NextLink from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLocale, useT } from "@/i18n/client";
import { INTL_TAG, LOCALES, LOCALE_COOKIE, LOCALE_NAMES, LOCALE_SHORT, stripLocale, type Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";

/** Saves an explicit choice right away; the proxy only records languages of full page loads. */
function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

/** Same page and query string in another language. */
function useLocaleHref() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  return (target: Locale) => {
    const rest = stripLocale(pathname);
    return `/${target}${rest === "/" ? "" : rest}${search ? `?${search}` : ""}`;
  };
}

function Menu({ tone }: { tone: "light" | "dark" }) {
  const t = useT();
  const current = useLocale();
  const hrefFor = useLocaleHref();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t("nav.language", { language: LOCALE_NAMES[current] })}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-bold tracking-wider transition-colors sm:h-11",
          tone === "dark" ? "text-ivory/80 hover:bg-ivory/10 hover:text-ivory" : "text-ink hover:bg-cream hover:text-brand",
        )}
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        <span>{LOCALE_SHORT[current]}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      <ul
        className={cn(
          "absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-line bg-paper p-1.5 shadow-lift transition-all duration-200",
          tone === "dark" && "bottom-full mb-2 mt-0",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
        )}
      >
        {LOCALES.map((l) => (
          <li key={l}>
            <NextLink
              href={hrefFor(l)}
              hrefLang={INTL_TAG[l]}
              lang={INTL_TAG[l]}
              aria-current={l === current ? "true" : undefined}
              onClick={() => {
                rememberLocale(l);
                setOpen(false);
              }}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors",
                l === current ? "bg-brand-50 font-semibold text-brand" : "text-ink hover:bg-cream",
              )}
            >
              {LOCALE_NAMES[l]}
              {l === current && <Check className="h-4 w-4" aria-hidden="true" />}
            </NextLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Compact dropdown used in the header and footer. */
export function LanguageSwitcher({ tone = "light" }: { tone?: "light" | "dark" }) {
  const current = useLocale();
  return (
    <Suspense
      fallback={
        <span className="inline-flex h-10 items-center gap-1.5 px-3 text-[12.5px] font-bold tracking-wider sm:h-11">
          <Globe className="h-4 w-4" aria-hidden="true" /> {LOCALE_SHORT[current]}
        </span>
      }
    >
      <Menu tone={tone} />
    </Suspense>
  );
}

function InlineList() {
  const current = useLocale();
  const hrefFor = useLocaleHref();
  return (
    <div className="grid grid-cols-3 gap-2">
      {LOCALES.map((l) => (
        <NextLink
          key={l}
          href={hrefFor(l)}
          hrefLang={INTL_TAG[l]}
          lang={INTL_TAG[l]}
          aria-current={l === current ? "true" : undefined}
          onClick={() => rememberLocale(l)}
          className={cn(
            "rounded-xl border px-2 py-2.5 text-center text-sm font-semibold transition-colors",
            l === current ? "border-brand bg-brand text-white" : "border-line text-ink hover:border-brand",
          )}
        >
          {LOCALE_NAMES[l]}
        </NextLink>
      ))}
    </div>
  );
}

/** Full-width buttons for the mobile menu. */
export function LanguageList() {
  return (
    <Suspense fallback={<div className="h-11" />}>
      <InlineList />
    </Suspense>
  );
}
