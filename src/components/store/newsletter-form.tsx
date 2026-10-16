"use client";

import { useId, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";
import { cn } from "@/lib/cn";
import { useT } from "@/i18n/client";

export function NewsletterForm({ tone = "dark", source = "footer" }: { tone?: "dark" | "light"; source?: string }) {
  const t = useT();
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setState("loading");
    try {
      await api("/api/newsletter", { body: { email, source } });
      setState("done");
    } catch (err) {
      setError(fieldErrors(err).email ?? errorMessage(err));
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <p role="status" className={cn("flex items-center gap-2 text-sm", tone === "dark" ? "text-ivory" : "text-ink")}>
        <Check className="h-4 w-4" /> {t("newsletter.success")}
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="w-full max-w-sm">
      <label htmlFor={id} className="sr-only">
        {t("newsletter.emailLabel")}
      </label>
      <div
        className={cn(
          "flex items-center rounded-full border p-1 pl-5 transition-colors",
          tone === "dark" ? "border-ivory/25 bg-ivory/5 focus-within:border-ivory/60" : "border-line bg-paper focus-within:border-brand",
        )}
      >
        <input
          id={id}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("newsletter.placeholder")}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn("min-w-0 flex-1 bg-transparent text-[15px] focus:outline-none", tone === "dark" ? "text-ivory placeholder:text-ivory/50" : "text-ink placeholder:text-ink-muted")}
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-60",
            tone === "dark" ? "bg-ivory text-brand hover:bg-cream" : "bg-brand text-white hover:bg-brand-hover",
          )}
          aria-label={t("newsletter.subscribe")}
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className={cn("mt-2 text-[13px]", tone === "dark" ? "text-brand-200" : "text-danger")}>
          {error}
        </p>
      )}
    </form>
  );
}
