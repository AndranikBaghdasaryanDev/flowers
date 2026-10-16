"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, ExternalLink, Info, AlertTriangle } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";
import { formatDateTime } from "@/lib/domain/time";

type LegalTexts = { privacy: string; terms: string; returns: string };

const PAGES: { key: keyof LegalTexts; title: string; href: string }[] = [
  { key: "privacy", title: "Privacy policy", href: "/legal/privacy" },
  { key: "terms", title: "Terms & conditions", href: "/legal/terms" },
  { key: "returns", title: "Cancellations & returns", href: "/legal/returns" },
];

const MAX = 20000;

export function LegalForm({ initial, reviewedAt, timeZone }: { initial: LegalTexts; reviewedAt: string | null; timeZone: string }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(initial);
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
      await api("/api/admin/content", { method: "PATCH", body: { ...form, markReviewed } });
      setDirty(false);
      setMarkReviewed(false);
      toast.success("Legal pages saved", markReviewed ? "They are now marked as reviewed today." : undefined);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setFields(fieldErrors(err));
      toast.error("Legal pages not saved", errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex gap-3 rounded-2xl border border-line bg-paper p-5 text-[13px] leading-relaxed text-ink-soft">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <p className="font-semibold text-ink">Formatting</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>Leave a blank line between paragraphs.</li>
              <li>A short line on its own (between blank lines) becomes a heading.</li>
              <li>An empty text shows “This page is being prepared” on the store.</li>
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
              {reviewedAt ? `Last reviewed ${formatDateTime(reviewedAt, timeZone, { day: "numeric", month: "long", year: "numeric" })}` : "Not reviewed yet"}
            </p>
            <p className="mt-1">
              These texts are legal commitments to your customers. Have them checked against your actual practices and local law; the review date is shown at the bottom of each public page.
            </p>
          </div>
        </div>
      </div>

      <FormError message={error} />

      {PAGES.map((p) => (
        <Panel
          key={p.key}
          title={p.title}
          actions={
            <a href={p.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
              View page <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          }
        >
          <Field
            id={`legal-${p.key}`}
            label={`${p.title} text`}
            error={fields[p.key]}
            hint={`${form[p.key].length.toLocaleString("en-GB")} / ${MAX.toLocaleString("en-GB")} characters`}
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

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-3 rounded-2xl border border-line bg-paper/95 px-4 py-3 shadow-[0_-8px_24px_-16px_rgb(43_30_35/0.25)] backdrop-blur sm:flex-row sm:items-center">
        <Checkbox
          id="legal-reviewed"
          checked={markReviewed}
          onChange={(e) => setMarkReviewed(e.target.checked)}
          label="I have reviewed these texts"
          description={dirty ? "Marks them as reviewed today. You have unsaved changes." : "Marks them as reviewed today."}
          className="sm:mr-auto"
        />
        <Button type="submit" loading={busy} className="shrink-0">
          Save legal pages
        </Button>
      </div>
    </form>
  );
}
