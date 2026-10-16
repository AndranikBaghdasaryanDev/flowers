"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageOff, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { ImagePicker } from "@/components/admin/image-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";
import { cn } from "@/lib/cn";
import type { GalleryItemDTO } from "@/lib/services/admin";
import type { I18nOverrides } from "@/lib/models/_util";
import { TranslationTabs, translationFields } from "@/components/admin/translation-tabs";
import { useT } from "@/i18n/client";

type Draft = {
  image: { id: string; src: string } | null;
  alt: string;
  caption: string;
  link: string;
  sortOrder: string;
  isActive: boolean;
  i18n: I18nOverrides<GalleryText>;
};

type GalleryText = { alt: string; caption: string };

const emptyDraft = (sortOrder: number): Draft => ({ image: null, alt: "", caption: "", link: "", sortOrder: String(sortOrder), isActive: true, i18n: {} });

const toBody = (d: { imageId: string; alt: string; caption: string; link: string; sortOrder: number; isActive: boolean }) => ({
  image: d.imageId,
  alt: d.alt,
  caption: d.caption,
  link: d.link,
  sortOrder: d.sortOrder,
  isActive: d.isActive,
});

export function GalleryManager({ initial }: { initial: GalleryItemDTO[] }) {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<GalleryItemDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<GalleryItemDTO | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const activeCount = items.filter((i) => i.isActive).length;

  const toggleActive = async (item: GalleryItemDTO) => {
    setToggling(item.id);
    try {
      setItems(await api<GalleryItemDTO[]>(`/api/admin/gallery/${item.id}`, { method: "PUT", body: { ...toBody(item), isActive: !item.isActive } }));
      toast.success(item.isActive ? t("admin.gallery.hiddenToast") : t("admin.gallery.shownToast"));
      router.refresh();
    } catch (e) {
      toast.error(t("admin.gallery.notUpdated"), errorMessage(e));
    } finally {
      setToggling(null);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      setItems(await api<GalleryItemDTO[]>(`/api/admin/gallery/${deleting.id}`, { method: "DELETE" }));
      setDeleting(null);
      toast.success(t("admin.gallery.deleted"));
      router.refresh();
    } catch (e) {
      toast.error(t("admin.gallery.notDeleted"), errorMessage(e));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <Panel
      title={t("admin.gallery.title")}
      description={`${t("admin.gallery.imageCount", { count: items.length })} · ${t("admin.gallery.shownCount", { count: activeCount })}`}
      actions={
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
          {t("admin.gallery.add")}
        </Button>
      }
      padded={false}
    >
      {items.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <p className="text-sm text-ink-muted">{t("admin.gallery.empty")}</p>
          <Button size="sm" variant="soft" className="mt-4" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            {t("admin.gallery.addFirst")}
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className={cn("flex flex-col overflow-hidden rounded-2xl border border-line bg-paper", !item.isActive && "opacity-75")}>
              <div className="relative aspect-[4/3] bg-cream">
                {item.image ? (
                  <Image src={item.image.src} alt={item.alt} fill sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw" className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-ink-muted">
                    <ImageOff className="h-6 w-6" aria-label={t("admin.gallery.missing")} />
                  </span>
                )}
                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                  {item.isActive ? <Badge tone="success">{t("admin.gallery.shown")}</Badge> : <Badge tone="neutral">{t("admin.common.hidden")}</Badge>}
                  {item.isSample && <Badge tone="warning">{t("admin.common.sample")}</Badge>}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-sm font-medium text-ink">{item.caption || <span className="text-ink-muted">{t("admin.gallery.noCaption")}</span>}</p>
                <p className="text-[13px] text-ink-soft">
                  <span className="font-semibold text-ink-muted">{t("admin.gallery.altPrefix")} </span>
                  {item.alt}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                  <span className="tabular">{t("admin.gallery.sortOrderN", { n: item.sortOrder })}</span>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-brand hover:underline">
                      <Link2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.link}</span>
                    </a>
                  )}
                </div>
                {item.isSample && (
                  <p className="text-xs text-warning">{t("admin.gallery.sampleNote")}</p>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <Checkbox
                    id={`gal-active-${item.id}`}
                    checked={item.isActive}
                    disabled={toggling === item.id}
                    onChange={() => toggleActive(item)}
                    label={t("admin.gallery.showOnSite")}
                    className="mr-auto text-[13px]"
                  />
                  <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(item)} aria-label={t("admin.gallery.editAria", { alt: item.alt })}>
                    {t("admin.common.edit")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hover:!bg-danger-50 hover:!text-danger"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => setDeleting(item)}
                    aria-label={t("admin.gallery.deleteAria", { alt: item.alt })}
                  >
                    {t("admin.common.delete")}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <GalleryItemDialog
          item={editing === "new" ? null : editing}
          nextSortOrder={items.length ? Math.min(1000, Math.max(...items.map((i) => i.sortOrder)) + 1) : 0}
          onClose={() => setEditing(null)}
          onSaved={(list, isNew) => {
            setItems(list);
            setEditing(null);
            toast.success(isNew ? t("admin.gallery.added") : t("admin.gallery.saved"));
            router.refresh();
          }}
        />
      )}

      {/* Mounted only while open: a closed <dialog> with display utilities would still cover the page. */}
      {deleting && (
        <ConfirmDialog
          open
          onClose={() => setDeleting(null)}
          onConfirm={remove}
          loading={deleteBusy}
          title={t("admin.gallery.deleteTitle")}
          confirmLabel={t("admin.gallery.deleteConfirm")}
          description={t("admin.gallery.deleteText")}
        >
          {deleting.image && (
            <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-xl bg-cream">
              <Image src={deleting.image.src} alt={deleting.alt} fill sizes="400px" className="object-cover" />
            </div>
          )}
        </ConfirmDialog>
      )}
    </Panel>
  );
}

function GalleryItemDialog({
  item,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  item: GalleryItemDTO | null;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: (items: GalleryItemDTO[], isNew: boolean) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<Draft>(() =>
    item
      ? {
          // A missing media file must be re-uploaded before the item can be saved.
          image: item.image ? { id: item.imageId, src: item.image.src } : null,
          alt: item.alt,
          caption: item.caption,
          link: item.link,
          sortOrder: String(item.sortOrder),
          isActive: item.isActive,
          i18n: item.i18n ?? {},
        }
      : emptyDraft(nextSortOrder),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setFields((f) => {
      if (!(key in f)) return f;
      const rest = { ...f };
      delete rest[key];
      return rest;
    });
  };

  const translated = translationFields(draft.i18n, (fn) => setDraft((d) => ({ ...d, i18n: fn(d.i18n) })), [
    { key: "alt", label: t("admin.gallery.alt"), base: draft.alt, maxLength: 200 },
    { key: "caption", label: t("admin.gallery.caption"), base: draft.caption, maxLength: 200 },
  ]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!draft.image) local.image = t("admin.gallery.errImage");
    if (draft.alt.trim().length < 3) local.alt = t("admin.gallery.errAlt");
    const sort = Number(draft.sortOrder);
    if (!Number.isInteger(sort) || sort < -1000 || sort > 1000) local.sortOrder = t("admin.gallery.errSort");
    if (Object.keys(local).length) {
      setFields(local);
      setError(t("admin.common.fixFields"));
      return;
    }
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const body = { image: draft.image!.id, alt: draft.alt, caption: draft.caption, link: draft.link.trim(), sortOrder: sort, isActive: draft.isActive, i18n: draft.i18n };
      const list = item
        ? await api<GalleryItemDTO[]>(`/api/admin/gallery/${item.id}`, { method: "PUT", body })
        : await api<GalleryItemDTO[]>("/api/admin/gallery", { method: "POST", body });
      onSaved(list, !item);
    } catch (err) {
      setError(errorMessage(err));
      setFields(fieldErrors(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={item ? t("admin.gallery.editTitle") : t("admin.gallery.addTitle")}
      description={item?.isSample ? t("admin.gallery.sampleSave") : undefined}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" form="gallery-item-form" loading={busy}>
            {item ? t("admin.gallery.save") : t("admin.gallery.add")}
          </Button>
        </div>
      }
    >
      <form id="gallery-item-form" onSubmit={submit} noValidate className="space-y-4">
        <FormError message={error} />
        <TranslationTabs fields={translated} errors={fields}>
          <div className="grid gap-5 sm:grid-cols-[1fr_1.1fr]">
            <ImagePicker
              label={t("admin.common.image")}
              purpose="gallery"
              alt={draft.alt}
              value={draft.image}
              onChange={(v) => set("image", v ? { id: v.id, src: v.src } : null)}
              error={fields.image}
            />
            <div className="min-w-0 space-y-4">
              <Field id="gal-alt" label={t("admin.gallery.alt")} required error={fields.alt} hint={t("admin.gallery.altHint")}>
                <Input id="gal-alt" value={draft.alt} maxLength={200} invalid={!!fields.alt} onChange={(e) => set("alt", e.target.value)} aria-describedby={fields.alt ? "gal-alt-error" : "gal-alt-hint"} />
              </Field>
              <Field id="gal-caption" label={t("admin.gallery.caption")} optional error={fields.caption}>
                <Input id="gal-caption" value={draft.caption} maxLength={200} invalid={!!fields.caption} onChange={(e) => set("caption", e.target.value)} />
              </Field>
              <Field id="gal-link" label={t("admin.gallery.link")} optional error={fields.link} hint={t("admin.gallery.linkHint")}>
                <Input id="gal-link" type="url" inputMode="url" value={draft.link} maxLength={300} placeholder="https://" invalid={!!fields.link} onChange={(e) => set("link", e.target.value)} aria-describedby={fields.link ? "gal-link-error" : "gal-link-hint"} />
              </Field>
              <Field id="gal-sort" label={t("admin.gallery.sortOrder")} error={fields.sortOrder} hint={t("admin.common.displayOrderHint")}>
                <Input id="gal-sort" type="number" inputMode="numeric" min={-1000} max={1000} step={1} value={draft.sortOrder} invalid={!!fields.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} aria-describedby={fields.sortOrder ? "gal-sort-error" : "gal-sort-hint"} />
              </Field>
              <Checkbox id="gal-active" checked={draft.isActive} onChange={(e) => set("isActive", e.target.checked)} label={t("admin.gallery.showOnStorefront")} />
            </div>
          </div>
        </TranslationTabs>
      </form>
    </Modal>
  );
}
