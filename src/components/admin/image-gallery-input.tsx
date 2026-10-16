"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { ImagePlus, Trash2, ArrowLeft, ArrowRight, Star, AlertCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { useT } from "@/i18n/client";

type UploadErrors = { failed: (status: number) => string; network: string };

export type GalleryImage = { media: string; alt: string; src: string; width: number; height: number };

type Upload = { key: string; name: string; progress: number; error?: string };

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

/** Uploads one file with progress reporting (XMLHttpRequest exposes upload progress; fetch does not). */
function uploadWithProgress(file: File, purpose: string, alt: string, onProgress: (p: number) => void, errors: UploadErrors): Promise<{ id: string; url: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", purpose);
    form.append("alt", alt);
    xhr.open("POST", "/api/admin/uploads");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body: { data?: { id: string; url: string; width: number; height: number }; error?: { message?: string } } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // ignore
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.data) resolve(body.data);
      else reject(new Error(body.error?.message ?? errors.failed(xhr.status)));
    };
    xhr.onerror = () => reject(new Error(errors.network));
    xhr.send(form);
  });
}

/**
 * Multi-image input: upload (with progress), reorder, choose the primary image (first),
 * edit alt text and remove. Only persistent media ids from the server are kept —
 * never temporary browser object URLs.
 */
export function ImageGalleryInput({
  value,
  onChange,
  purpose = "product",
  max = 12,
  defaultAlt = "",
  error,
}: {
  value: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  purpose?: "product" | "category" | "content" | "gallery";
  max?: number;
  defaultAlt?: string;
  error?: string;
}) {
  const t = useT();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const latest = useRef(value);
  latest.current = value;

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const room = max - latest.current.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    for (const file of list) {
      const key = `${file.name}-${file.size}-${Math.random()}`;
      if (file.size > MAX_BYTES) {
        setUploads((u) => [...u, { key, name: file.name, progress: 0, error: t("admin.media.tooLarge") }]);
        continue;
      }
      if (!ACCEPT.split(",").includes(file.type)) {
        setUploads((u) => [...u, { key, name: file.name, progress: 0, error: t("admin.media.wrongType") }]);
        continue;
      }
      setUploads((u) => [...u, { key, name: file.name, progress: 0 }]);
      try {
        const res = await uploadWithProgress(file, purpose, defaultAlt, (p) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, progress: p } : x))), {
          failed: (status) => t("admin.media.uploadFailedStatus", { status: String(status) }),
          network: t("admin.media.networkError"),
        });
        onChange([...latest.current, { media: res.id, src: res.url, width: res.width, height: res.height, alt: defaultAlt }]);
        setUploads((u) => u.filter((x) => x.key !== key));
      } catch (e) {
        setUploads((u) => u.map((x) => (x.key === key ? { ...x, error: (e as Error).message } : x)));
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const move = (i: number, dir: -1 | 1) => {
    const next = [...value];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const makePrimary = (i: number) => onChange([value[i], ...value.filter((_, k) => k !== i)]);

  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {value.map((img, i) => (
          <li key={img.media} className={cn("overflow-hidden rounded-2xl border bg-ivory", i === 0 ? "border-brand" : "border-line")}>
            <div className="relative aspect-[4/5] bg-cream">
              <Image src={img.src} alt={img.alt || t("admin.media.productImage")} fill sizes="200px" className="object-cover" />
              {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white">{t("admin.media.primary")}</span>}
            </div>
            <div className="space-y-2 p-2.5">
              <label className="sr-only" htmlFor={`${inputId}-alt-${i}`}>
                {t("admin.media.altFor", { n: i + 1 })}
              </label>
              <input
                id={`${inputId}-alt-${i}`}
                value={img.alt}
                maxLength={300}
                placeholder={t("admin.media.describe")}
                onChange={(e) => onChange(value.map((v, k) => (k === i ? { ...v, alt: e.target.value } : v)))}
                className={cn("h-9 w-full rounded-lg border bg-paper px-2.5 text-[13px] focus:border-brand focus:outline-none", img.alt.trim().length < 3 ? "border-warning" : "border-line")}
              />
              <div className="flex items-center justify-between">
                <div className="flex">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-md p-1.5 text-ink-muted hover:bg-cream hover:text-ink disabled:opacity-30" aria-label={t("admin.media.moveLeft", { n: i + 1 })}>
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} className="rounded-md p-1.5 text-ink-muted hover:bg-cream hover:text-ink disabled:opacity-30" aria-label={t("admin.media.moveRight", { n: i + 1 })}>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  {i > 0 && (
                    <button type="button" onClick={() => makePrimary(i)} className="rounded-md p-1.5 text-ink-muted hover:bg-cream hover:text-brand" aria-label={t("admin.media.makePrimaryAria", { n: i + 1 })} title={t("admin.media.makePrimary")}>
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="rounded-md p-1.5 text-ink-muted hover:bg-danger-50 hover:text-danger" aria-label={t("admin.media.removeN", { n: i + 1 })}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
        {uploads.map((u) => (
          <li key={u.key} className={cn("flex aspect-[4/5] flex-col items-center justify-center rounded-2xl border p-3 text-center", u.error ? "border-danger/40 bg-danger-50" : "border-line bg-cream")}>
            {u.error ? (
              <>
                <AlertCircle className="h-5 w-5 text-danger" />
                <p className="mt-2 line-clamp-2 text-[12px] font-semibold text-ink">{u.name}</p>
                <p className="mt-1 text-[12px] text-danger">{u.error}</p>
                <button type="button" onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))} className="mt-2 text-[12px] font-semibold underline">
                  {t("common.dismiss")}
                </button>
              </>
            ) : (
              <>
                <Spinner className="h-5 w-5 text-brand" />
                <p className="mt-2 line-clamp-2 text-[12px] text-ink-soft">{u.name}</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={u.progress} aria-valuemin={0} aria-valuemax={100} aria-label={t("admin.media.uploadingName", { name: u.name })}>
                  <div className="h-full bg-brand transition-all" style={{ width: `${u.progress}%` }} />
                </div>
              </>
            )}
          </li>
        ))}
        {value.length + uploads.filter((u) => !u.error).length < max && (
          <li>
            <label
              htmlFor={inputId}
              className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line-strong bg-paper text-center text-ink-muted transition-colors hover:border-brand hover:text-brand focus-within:border-brand"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void onFiles(e.dataTransfer.files);
              }}
            >
              <ImagePlus className="h-6 w-6" />
              <span className="mt-2 text-[13px] font-semibold">{max === 1 ? t("admin.media.upload") : t("admin.media.addImages")}</span>
              <span className="mt-1 px-3 text-[11.5px]">{t("admin.media.formatsShort")}</span>
              <input ref={inputRef} id={inputId} type="file" accept={ACCEPT} multiple={max > 1} className="sr-only" onChange={(e) => void onFiles(e.target.files)} />
            </label>
          </li>
        )}
      </ul>
      {error && <p className="mt-2 text-[13px] text-danger" role="alert">{error}</p>}
    </div>
  );
}
