"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, ExternalLink, Info, AlertTriangle } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";
import { useFormat, useLocale, useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/translate";
import type { Messages } from "@/i18n/messages";
import { TranslationTabs, pickOverrides, translationFields } from "@/components/admin/translation-tabs";
import type { I18nOverrides } from "@/lib/models/_util";
import type { SettingsText } from "@/lib/models/content";

type LegalTexts = { privacy: string; terms: string; returns: string };

const LEGAL_KEYS = ["privacy", "terms", "returns"] as const;

const PAGES: { key: keyof LegalTexts; title: MessageKey<Messages>; label: MessageKey<Messages>; href: string }[] = [
  { key: "privacy", title: "admin.legal.privacy", label: "admin.legal.privacyText", href: "/legal/privacy" },
  { key: "terms", title: "admin.legal.terms", label: "admin.legal.termsText", href: "/legal/terms" },
  { key: "returns", title: "admin.legal.returns", label: "admin.legal.returnsText", href: "/legal/returns" },
];

const MAX = 20000;

export function LegalForm({
  initial,
  initialI18n,
  reviewedAt,
  timeZone,
}: {
  initial: LegalTexts;
  /** Stored store-text overrides; only the legal pages are edited and saved here. */
  initialI18n: I18nOverrides<SettingsText>;
  reviewedAt: string | null;
  timeZone: string;
}) {
  const t = useT();
  const locale = useLocale();
  const fmt = useFormat();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [i18n, setI18n] = useState(initialI18n);
  const [markReviewed, setMarkReviewed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await api("/api/admin/content", { method: "PATCH", body: { ...form, markReviewed, i18n: pickOverrides(i18n, LEGAL_KEYS) } });
      setDirty(false);
      setMarkReviewed(false);
      toast.success(t("admin.legal.saved"), markReviewed ? t("admin.legal.savedReviewed") : undefined);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setFields(fieldErrors(err));
      toast.error(t("admin.legal.notSaved"), errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const translated = translationFields(
    i18n,
    (fn) => {
      setI18n(fn);
      setDirty(true);
    },
    PAGES.map((p) => ({ key: p.key, label: t(p.label), base: form[p.key], rows: 16, maxLength: MAX, group: t(p.title) })),
  );

  return (
    <form onSubmit={save} noValidate className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex gap-3 rounded-2xl border border-line bg-paper p-5 text-[13px] leading-relaxed text-ink-soft">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <p className="font-semibold text-ink">{t("admin.legal.formatting")}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>{t("admin.legal.format1")}</li>
              <li>{t("admin.legal.format2")}</li>
              <li>{t("admin.legal.format3")}</li>
            </ul>
          </div>
        </div>
        <div className="flex gap-3 rounded-2xl border border-line bg-paper p-5 text-[13px] leading-relaxed text-ink-soft">
          {reviewedAt ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          )}
          <div>
            <p className="font-semibold text-ink">
              {reviewedAt
                ? t("admin.legal.lastReviewed", { date: fmt.dateTime(reviewedAt, timeZone, { day: "numeric", month: "long", year: "numeric" }) })
                : t("admin.legal.notReviewed")}
            </p>
            <p className="mt-1">{t("admin.legal.reviewNote")}</p>
          </div>
        </div>
      </div>

      <FormError message={error} />

      <TranslationTabs fields={translated} errors={fields} asPanels>
        <div className="space-y-6">
          {PAGES.map((p) => (
            <Panel
              key={p.key}
              title={t(p.title)}
              actions={
                <a href={`/${locale}${p.href}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
                  {t("admin.legal.viewPage")} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">{t("admin.common.opensNewTab")}</span>
                </a>
              }
            >
              <Field
                id={`legal-${p.key}`}
                label={t(p.label)}
                error={fields[p.key]}
                hint={t("admin.legal.chars", { count: form[p.key].length, max: MAX })}
              >
                <Textarea
                  id={`legal-${p.key}`}
                  rows={16}
                  maxLength={MAX}
                  value={form[p.key]}
                  invalid={!!fields[p.key]}
                  aria-describedby={fields[p.key] ? `legal-${p.key}-error` : `legal-${p.key}-hint`}
                  className="min-h-[18rem] font-mono text-[13.5px]"
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((f) => ({ ...f, [p.key]: value }));
                    setDirty(true);
                  }}
                />
              </Field>
            </Panel>
          ))}
        </div>
      </TranslationTabs>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-3 rounded-2xl border border-line bg-paper/95 px-4 py-3 shadow-[0_-8px_24px_-16px_rgb(43_30_35/0.25)] backdrop-blur sm:flex-row sm:items-center">
        <Checkbox
          id="legal-reviewed"
          checked={markReviewed}
          onChange={(e) => setMarkReviewed(e.target.checked)}
          label={t("admin.legal.reviewed")}
          description={dirty ? `${t("admin.legal.reviewedHint")} ${t("admin.common.unsavedChanges")}` : t("admin.legal.reviewedHint")}
          className="sm:mr-auto"
        />
        <Button type="submit" loading={busy} className="shrink-0">
          {t("admin.legal.save")}
        </Button>
      </div>
    </form>
  );
}
