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
};

type Defaults = { heroEyebrow: string; heroTitle: string; heroSubtitle: string; storyTitle: string; storyBody: string };

type TextKey = Exclude<keyof ContentFormValues, "heroImage" | "storyImage">;

const DEFAULT_HINT = "Leave empty to show the default text (shown in grey).";

export function ContentForm({ initial, defaults }: { initial: ContentFormValues; defaults: Defaults }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const update = <K extends keyof ContentFormValues>(key: K, value: ContentFormValues[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

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
        body: { ...form, heroImage: form.heroImage?.id ?? null, storyImage: form.storyImage?.id ?? null },
      });
      setDirty(false);
      toast.success("Content saved", "The storefront now shows the new texts and images.");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setFields(fieldErrors(err));
      toast.error("Content not saved", errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="space-y-6">
      <FormError message={error} />

      <Panel
        title="Announcement bar"
        description="A short line shown at the very top of every store page. Leave empty to hide it."
      >
        <Field id="ct-announcement" label="Announcement" optional error={fields.announcement} hint="Up to 160 characters, e.g. a holiday schedule.">
          <Input {...text("announcement", "Up to 160 characters, e.g. a holiday schedule.")} maxLength={160} />
        </Field>
      </Panel>

      <Panel title="Homepage hero" description="The first thing visitors see on the homepage.">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="min-w-0 space-y-4">
            <Field id="ct-heroEyebrow" label="Small heading above the title" optional error={fields.heroEyebrow} hint={DEFAULT_HINT}>
              <Input {...text("heroEyebrow", DEFAULT_HINT)} maxLength={80} placeholder={defaults.heroEyebrow} />
            </Field>
            <Field id="ct-heroTitle" label="Title" optional error={fields.heroTitle} hint={DEFAULT_HINT}>
              <Input {...text("heroTitle", DEFAULT_HINT)} maxLength={120} placeholder={defaults.heroTitle} />
            </Field>
            <Field id="ct-heroSubtitle" label="Subtitle" optional error={fields.heroSubtitle} hint={DEFAULT_HINT}>
              <Textarea {...text("heroSubtitle", DEFAULT_HINT)} rows={3} maxLength={300} placeholder={defaults.heroSubtitle} />
            </Field>
          </div>
          <div className="min-w-0 space-y-4">
            <ImagePicker
              label="Hero image"
              purpose="content"
              aspect="4 / 5"
              alt={form.heroImageAlt}
              value={form.heroImage}
              onChange={(v) => update("heroImage", v ? { id: v.id, src: v.src } : null)}
              error={fields.heroImage}
              hint="A tall photo works best. Without an image, a decorative placeholder is shown."
            />
            <Field id="ct-heroImageAlt" label="Hero image description (alt text)" optional error={fields.heroImageAlt} hint="Describe the photo for people using screen readers.">
              <Input {...text("heroImageAlt", "Describe the photo for people using screen readers.")} maxLength={200} />
            </Field>
          </div>
        </div>
      </Panel>

      <Panel title="Our story section" description="The story block on the homepage.">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="min-w-0 space-y-4">
            <Field id="ct-storyTitle" label="Title" optional error={fields.storyTitle} hint={DEFAULT_HINT}>
              <Input {...text("storyTitle", DEFAULT_HINT)} maxLength={120} placeholder={defaults.storyTitle} />
            </Field>
            <Field
              id="ct-storyBody"
              label="Text"
              optional
              error={fields.storyBody}
              hint="Leave a blank line between paragraphs. Leave empty to show the default text (shown in grey)."
            >
              <Textarea
                {...text("storyBody", "Leave a blank line between paragraphs. Leave empty to show the default text (shown in grey).")}
                rows={8}
                maxLength={3000}
                placeholder={defaults.storyBody}
              />
            </Field>
          </div>
          <div className="min-w-0 space-y-4">
            <ImagePicker
              label="Story image"
              purpose="content"
              aspect="4 / 5"
              alt={form.storyImageAlt}
              value={form.storyImage}
              onChange={(v) => update("storyImage", v ? { id: v.id, src: v.src } : null)}
              error={fields.storyImage}
            />
            <Field id="ct-storyImageAlt" label="Story image description (alt text)" optional error={fields.storyImageAlt} hint="Describe the photo for people using screen readers.">
              <Input {...text("storyImageAlt", "Describe the photo for people using screen readers.")} maxLength={200} />
            </Field>
          </div>
        </div>
      </Panel>

      <Panel
        title="About & delivery pages"
        actions={
          <div className="flex flex-wrap gap-3 text-[13px] font-semibold">
            <a href="/about" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
              View About <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <a href="/delivery" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
              View Delivery <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Field id="ct-aboutBody" label="About page text" optional error={fields.aboutBody} hint="Leave a blank line between paragraphs. Only write what is true about your shop.">
            <Textarea {...text("aboutBody", "Leave a blank line between paragraphs. Only write what is true about your shop.")} rows={10} maxLength={6000} />
          </Field>
          <Field id="ct-deliveryInfo" label="Delivery page introduction" optional error={fields.deliveryInfo} hint="Shown above the delivery options and fees. Leave a blank line between paragraphs.">
            <Textarea {...text("deliveryInfo", "Shown above the delivery options and fees. Leave a blank line between paragraphs.")} rows={10} maxLength={3000} />
          </Field>
        </div>
      </Panel>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-line bg-paper/95 px-4 py-3 shadow-[0_-8px_24px_-16px_rgb(43_30_35/0.25)] backdrop-blur">
        <span className="mr-auto text-[13px] text-ink-muted" aria-live="polite">
          {dirty ? "You have unsaved changes." : "All changes saved."}
        </span>
        <Button type="submit" loading={busy}>
          Save content
        </Button>
      </div>
    </form>
  );
}
