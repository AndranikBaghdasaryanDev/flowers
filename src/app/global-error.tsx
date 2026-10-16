"use client";

import { useSyncExternalStore } from "react";

/**
 * Last-resort error page. It replaces the root layout, so no I18nProvider is available:
 * the language is read from the URL (or <html lang>) and the few strings live here.
 */
const COPY = {
  hy: { title: "Ինչ-որ բան այն չէ", text: "Խնդրում ենք փորձել մի փոքր ուշ։", retry: "Կրկին փորձել" },
  en: { title: "Something went wrong", text: "Please try again in a moment.", retry: "Try again" },
  ru: { title: "Что-то пошло не так", text: "Пожалуйста, попробуйте ещё раз чуть позже.", retry: "Повторить" },
} as const;

type Lang = keyof typeof COPY;

function detectLang(): Lang {
  const candidates = [window.location.pathname.split("/")[1], document.documentElement.lang.split("-")[0]];
  for (const c of candidates) if (c === "hy" || c === "en" || c === "ru") return c;
  return "hy";
}

const noopSubscribe = () => () => {};

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const lang = useSyncExternalStore<Lang>(noopSubscribe, detectLang, () => "hy");
  const copy = COPY[lang];
  return (
    <html lang={lang}>
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#fbf8f4", color: "#2b1e23", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <p style={{ letterSpacing: "0.3em", color: "#781241", fontSize: 22 }}>FLORIANI</p>
          <h1 style={{ fontWeight: 400 }}>{copy.title}</h1>
          <p>{copy.text}</p>
          <button onClick={reset} style={{ background: "#781241", color: "#fff", border: 0, borderRadius: 999, padding: "12px 22px", cursor: "pointer" }}>
            {copy.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
