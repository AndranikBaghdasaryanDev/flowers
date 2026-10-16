"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { ImagePicker } from "@/components/admin/image-picker";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea, describedBy } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";
import { TranslationTabs, pickOverrides, translationFields } from "@/components/admin/translation-tabs";
import type { I18nOverrides } from "@/lib/models/_util";
import type { SettingsText } from "@/lib/models/content";
import { useT } from "@/i18n/client";

type ImageValue = { id: string; src: string } | null;

export type ContentFormValues = {
  announcement: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: ImageValue;
  heroImageAlt: string;
  storyTitle: string;
  storyBody: string;
  storyImage: ImageValue;
  storyImageAlt: string;
  aboutBody: string;
  deliveryInfo: string;
  /** Stored store-text overrides; only the content fields are edited and saved here. */
  i18n: I18nOverrides<SettingsText>;
};

const CONTENT_TEXT = [
  "announcement",
  "heroEyebrow",
  "heroTitle",
  "heroSubtitle",
  "heroImageAlt",
  "storyTitle",
  "storyBody",
  "storyImageAlt",
  "aboutBody",
  "deliveryInfo",
] as const satisfies readonly (keyof SettingsText)[];

type Defaults = { heroEyebrow: string; heroTitle: string; heroSubtitle: string; storyTitle: string; storyBody: string };

type TextKey = Exclude<keyof ContentFormValues, "heroImage" | "storyImage" | "i18n">;

export function ContentForm({ initial, defaults }: { initial: ContentFormValues; defaults: Defaults }) {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const defaultHint = t("admin.content.defaultHint");
  const altHint = t("admin.content.altHint");
  const announcementHint = t("admin.content.announcementHint");
  const storyBodyHint = t("admin.content.storyBodyHint");
  const aboutHint = t("admin.content.aboutHint");
  const deliveryHint = t("admin.content.deliveryHint");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const update = <K extends keyof ContentFormValues>(key: K, value: ContentFormValues[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const builtIn = t("admin.i18n.builtInDefault");
  const tr = (key: TextKey, label: string, group: string, opts: { rows?: number; maxLength: number; builtIn?: boolean }) => ({
    key,
    label,
    base: form[key],
    group,
    rows: opts.rows,
    maxLength: opts.maxLength,
    emptyHint: opts.builtIn ? builtIn : undefined,
  });
  const translated = translationFields(
    form.i18n,
    (fn) => {
      setForm((f) => ({ ...f, i18n: fn(f.i18n) }));
      setDirty(true);
    },
    [
      tr("announcement", t("admin.content.announcement"), t("admin.content.announcementTitle"), { maxLength: 160 }),
      tr("heroEyebrow", t("admin.content.eyebrow"), t("admin.content.heroTitle"), { maxLength: 80, builtIn: true }),
      tr("heroTitle", t("admin.content.title"), t("admin.content.heroTitle"), { maxLength: 120, builtIn: true }),
      tr("heroSubtitle", t("admin.content.subtitle"), t("admin.content.heroTitle"), { rows: 3, maxLength: 300, builtIn: true }),
      tr("heroImageAlt", t("admin.content.heroImageAlt"), t("admin.content.heroTitle"), { maxLength: 200, builtIn: true }),
      tr("storyTitle", t("admin.content.title"), t("admin.content.storyTitle"), { maxLength: 120, builtIn: true }),
      tr("storyBody", t("admin.content.text"), t("admin.content.storyTitle"), { rows: 8, maxLength: 3000, builtIn: true }),
      tr("storyImageAlt", t("admin.content.storyImageAlt"), t("admin.content.storyTitle"), { maxLength: 200, builtIn: true }),
      tr("aboutBody", t("admin.content.aboutBody"), t("admin.content.pagesTitle"), { rows: 10, maxLength: 6000 }),
      tr("deliveryInfo", t("admin.content.deliveryInfo"), t("admin.content.pagesTitle"), { rows: 10, maxLength: 3000 }),
    ],
  );

  /** Text input / textarea props wired to a form key. */
  const text = (key: TextKey, hint?: string) => ({
    id: `ct-${key}`,
    value: form[key],
    invalid: !!fields[key],
    "aria-describedby": describedBy(`ct-${key}`, fields[key], hint),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(key, e.target.value),
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await api("/api/admin/content", {
        method: "PUT",
        body: { ...form, heroImage: form.heroImage?.id ?? null, storyImage: form.storyImage?.id ?? null, i18n: pickOverrides(form.i18n, CONTENT_TEXT) },
      });
      setDirty(false);
      toast.success(t("admin.content.saved"), t("admin.content.savedText"));
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setFields(fieldErrors(err));
      toast.error(t("admin.content.notSaved"), errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="space-y-6">
      <FormError message={error} />

      <TranslationTabs fields={translated} errors={fields} asPanels>
        <div className="space-y-6">
          <Panel
            title={t("admin.content.announcementTitle")}
            description={t("admin.content.announcementText")}
          >
            <Field id="ct-announcement" label={t("admin.content.announcement")} optional error={fields.announcement} hint={announcementHint}>
              <Input {...text("announcement", announcementHint)} maxLength={160} />
            </Field>
          </Panel>

          <Panel title={t("admin.content.heroTitle")} description={t("admin.content.heroText")}>
            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <div className="min-w-0 space-y-4">
                <Field id="ct-heroEyebrow" label={t("admin.content.eyebrow")} optional error={fields.heroEyebrow} hint={defaultHint}>
                  <Input {...text("heroEyebrow", defaultHint)} maxLength={80} placeholder={defaults.heroEyebrow} />
                </Field>
                <Field id="ct-heroTitle" label={t("admin.content.title")} optional error={fields.heroTitle} hint={defaultHint}>
                  <Input {...text("heroTitle", defaultHint)} maxLength={120} placeholder={defaults.heroTitle} />
                </Field>
                <Field id="ct-heroSubtitle" label={t("admin.content.subtitle")} optional error={fields.heroSubtitle} hint={defaultHint}>
                  <Textarea {...text("heroSubtitle", defaultHint)} rows={3} maxLength={300} placeholder={defaults.heroSubtitle} />
                </Field>
              </div>
              <div className="min-w-0 space-y-4">
                <ImagePicker
                  label={t("admin.content.heroImage")}
                  purpose="content"
                  aspect="4 / 5"
                  alt={form.heroImageAlt}
                  value={form.heroImage}
                  onChange={(v) => update("heroImage", v ? { id: v.id, src: v.src } : null)}
                  error={fields.heroImage}
                  hint={t("admin.content.heroImageHint")}
                />
                <Field id="ct-heroImageAlt" label={t("admin.content.heroImageAlt")} optional error={fields.heroImageAlt} hint={altHint}>
                  <Input {...text("heroImageAlt", altHint)} maxLength={200} />
                </Field>
              </div>
            </div>
          </Panel>

          <Panel title={t("admin.content.storyTitle")} description={t("admin.content.storyText")}>
            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <div className="min-w-0 space-y-4">
                <Field id="ct-storyTitle" label={t("admin.content.title")} optional error={fields.storyTitle} hint={defaultHint}>
                  <Input {...text("storyTitle", defaultHint)} maxLength={120} placeholder={defaults.storyTitle} />
                </Field>
                <Field
                  id="ct-storyBody"
                  label={t("admin.content.text")}
                  optional
                  error={fields.storyBody}
                  hint={storyBodyHint}
                >
                  <Textarea
                    {...text("storyBody", storyBodyHint)}
                    rows={8}
                    maxLength={3000}
                    placeholder={defaults.storyBody}
                  />
                </Field>
              </div>
              <div className="min-w-0 space-y-4">
                <ImagePicker
                  label={t("admin.content.storyImage")}
                  purpose="content"
                  aspect="4 / 5"
                  alt={form.storyImageAlt}
                  value={form.storyImage}
                  onChange={(v) => update("storyImage", v ? { id: v.id, src: v.src } : null)}
                  error={fields.storyImage}
                />
                <Field id="ct-storyImageAlt" label={t("admin.content.storyImageAlt")} optional error={fields.storyImageAlt} hint={altHint}>
                  <Input {...text("storyImageAlt", altHint)} maxLength={200} />
                </Field>
              </div>
            </div>
          </Panel>

          <Panel
            title={t("admin.content.pagesTitle")}
            actions={
              <div className="flex flex-wrap gap-3 text-[13px] font-semibold">
                <a href="/about" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
                  {t("admin.content.viewAbout")} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
                <a href="/delivery" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
                  {t("admin.content.viewDelivery")} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            }
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <Field id="ct-aboutBody" label={t("admin.content.aboutBody")} optional error={fields.aboutBody} hint={aboutHint}>
                <Textarea {...text("aboutBody", aboutHint)} rows={10} maxLength={6000} />
              </Field>
              <Field id="ct-deliveryInfo" label={t("admin.content.deliveryInfo")} optional error={fields.deliveryInfo} hint={deliveryHint}>
                <Textarea {...text("deliveryInfo", deliveryHint)} rows={10} maxLength={3000} />
              </Field>
            </div>
          </Panel>
        </div>
      </TranslationTabs>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-line bg-paper/95 px-4 py-3 shadow-[0_-8px_24px_-16px_rgb(43_30_35/0.25)] backdrop-blur">
        <span className="mr-auto text-[13px] text-ink-muted" aria-live="polite">
          {dirty ? t("admin.common.unsavedChanges") : t("admin.common.allSaved")}
        </span>
        <Button type="submit" loading={busy}>
          {t("admin.content.save")}
        </Button>
      </div>
    </form>
  );
}
