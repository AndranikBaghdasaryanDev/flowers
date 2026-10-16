"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { AlertCircle, ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { api, errorMessage } from "@/lib/client/api";
import { cn } from "@/lib/cn";
import { useT } from "@/i18n/client";

export type PickedImage = { id: string; src: string; width: number; height: number };

type UploadResponse = { id: string; url: string; width: number; height: number; size: number; alt: string };

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
const ACCEPTED_TYPES = new Set(ACCEPT.split(","));

/**
 * Single-image input: uploads one file to the media store and reports its persistent
 * media id. `aspect` is a CSS aspect-ratio value for the preview box (e.g. "4 / 3"; default "4 / 3").
 */
export function ImagePicker({
  value,
  onChange,
  purpose,
  label,
  aspect = "4 / 3",
  alt = "",
  hint,
  error,
  className,
}: {
  value: { id: string; src: string } | null;
  onChange: (v: PickedImage | null) => void;
  purpose: "product" | "category" | "content" | "gallery";
  label: string;
  aspect?: string;
  /** Optional alt text stored with the uploaded media. */
  alt?: string;
  hint?: string;
  error?: string;
  className?: string;
}) {
  const t = useT();
  const inputId = useId();
  const statusId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const shownError = uploadError ?? error ?? null;

  const pick = () => inputRef.current?.click();

  const upload = async (file: File) => {
    setUploadError(null);
    if (file.type && !ACCEPTED_TYPES.has(file.type)) {
      setUploadError(t("admin.media.typeNotSupported"));
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError(t("admin.media.sizeTooLarge", { size: (file.size / 1024 / 1024).toFixed(1) }));
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("purpose", purpose);
      form.append("alt", alt);
      const res = await api<UploadResponse>("/api/admin/uploads", { form });
      onChange({ id: res.id, src: res.url, width: res.width, height: res.height });
    } catch (e) {
      setUploadError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-[13px] font-semibold text-ink" id={`${inputId}-label`}>
        {label}
      </p>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-labelledby={`${inputId}-label`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      <div
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-2xl border bg-cream",
          shownError ? "border-danger/40" : value ? "border-line" : "border-dashed border-line-strong",
        )}
        style={{ aspectRatio: aspect }}
      >
        {value ? (
          <Image src={value.src} alt="" fill sizes="(min-width: 640px) 448px, 100vw" className="object-cover" />
        ) : (
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            aria-describedby={statusId}
            className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-ink-muted transition-colors hover:bg-brand-50/40 hover:text-brand focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
          >
            <ImagePlus className="h-7 w-7" aria-hidden="true" />
            <span className="text-sm font-semibold">{t("admin.media.upload")}</span>
            <span className="text-xs">{t("admin.media.formats")}</span>
          </button>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-paper/75 text-sm font-semibold text-ink">
            <Spinner className="h-5 w-5 text-brand" /> {t("admin.media.uploading")}
          </div>
        )}
      </div>
      <p id={statusId} className="sr-only" role="status" aria-live="polite">
        {busy ? t("admin.media.uploadingImage") : value ? t("admin.media.selected") : t("admin.media.noneSelected")}
      </p>
      {value && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-4 text-[13px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> {t("admin.media.replace")}
          </button>
          <button
            type="button"
            onClick={() => {
              setUploadError(null);
              onChange(null);
            }}
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-danger-50 hover:text-danger disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("admin.media.remove")}
          </button>
        </div>
      )}
      {shownError ? (
        <p className="flex items-start gap-1.5 text-[13px] text-danger" role="alert">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {shownError}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
