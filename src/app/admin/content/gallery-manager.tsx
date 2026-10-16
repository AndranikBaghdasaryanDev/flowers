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

type Draft = {
  image: { id: string; src: string } | null;
  alt: string;
  caption: string;
  link: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyDraft = (sortOrder: number): Draft => ({ image: null, alt: "", caption: "", link: "", sortOrder: String(sortOrder), isActive: true });

const toBody = (d: { imageId: string; alt: string; caption: string; link: string; sortOrder: number; isActive: boolean }) => ({
  image: d.imageId,
  alt: d.alt,
  caption: d.caption,
  link: d.link,
  sortOrder: d.sortOrder,
  isActive: d.isActive,
});

export function GalleryManager({ initial }: { initial: GalleryItemDTO[] }) {
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
      toast.success(item.isActive ? "Image hidden from the gallery" : "Image shown in the gallery");
      router.refresh();
    } catch (e) {
      toast.error("Gallery not updated", errorMessage(e));
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
      toast.success("Image deleted");
      router.refresh();
    } catch (e) {
      toast.error("Image not deleted", errorMessage(e));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <Panel
      title="Gallery"
      description={`${items.length} ${items.length === 1 ? "image" : "images"} · ${activeCount} shown on the storefront (up to 12 visible, lowest sort order first)`}
      actions={
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
          Add image
        </Button>
      }
      padded={false}
    >
      {items.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <p className="text-sm text-ink-muted">No gallery images yet.</p>
          <Button size="sm" variant="soft" className="mt-4" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            Add the first image
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
                    <ImageOff className="h-6 w-6" aria-label="Image missing" />
                  </span>
                )}
                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                  {item.isActive ? <Badge tone="success">Shown</Badge> : <Badge tone="neutral">Hidden</Badge>}
                  {item.isSample && <Badge tone="warning">Sample</Badge>}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-sm font-medium text-ink">{item.caption || <span className="text-ink-muted">No caption</span>}</p>
                <p className="text-[13px] text-ink-soft">
                  <span className="font-semibold text-ink-muted">Alt: </span>
                  {item.alt}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                  <span className="tabular">Sort order {item.sortOrder}</span>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-brand hover:underline">
                      <Link2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.link}</span>
                    </a>
                  )}
                </div>
                {item.isSample && (
                  <p className="text-xs text-warning">Placeholder image from the demo setup. Replace it with your own photo or delete it.</p>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <Checkbox
                    id={`gal-active-${item.id}`}
                    checked={item.isActive}
                    disabled={toggling === item.id}
                    onChange={() => toggleActive(item)}
                    label="Show on site"
                    className="mr-auto text-[13px]"
                  />
                  <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(item)} aria-label={`Edit image: ${item.alt}`}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hover:!bg-danger-50 hover:!text-danger"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => setDeleting(item)}
                    aria-label={`Delete image: ${item.alt}`}
                  >
                    Delete
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
            toast.success(isNew ? "Image added to the gallery" : "Gallery image saved");
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
          title="Delete this image?"
          confirmLabel="Delete image"
          description="The image is removed from the gallery and its file is deleted. This cannot be undone."
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!draft.image) local.image = "Upload an image.";
    if (draft.alt.trim().length < 3) local.alt = "Describe the image (at least 3 characters).";
    const sort = Number(draft.sortOrder);
    if (!Number.isInteger(sort) || sort < -1000 || sort > 1000) local.sortOrder = "Use a whole number between -1000 and 1000.";
    if (Object.keys(local).length) {
      setFields(local);
      setError("Please fix the highlighted fields.");
      return;
    }
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const body = { image: draft.image!.id, alt: draft.alt, caption: draft.caption, link: draft.link.trim(), sortOrder: sort, isActive: draft.isActive };
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
      title={item ? "Edit gallery image" : "Add gallery image"}
      description={item?.isSample ? "This is a sample image. Saving it marks it as your own." : undefined}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="gallery-item-form" loading={busy}>
            {item ? "Save image" : "Add image"}
          </Button>
        </div>
      }
    >
      <form id="gallery-item-form" onSubmit={submit} noValidate className="space-y-4">
        <FormError message={error} />
        <div className="grid gap-5 sm:grid-cols-[1fr_1.1fr]">
          <ImagePicker
            label="Image"
            purpose="gallery"
            alt={draft.alt}
            value={draft.image}
            onChange={(v) => set("image", v ? { id: v.id, src: v.src } : null)}
            error={fields.image}
          />
          <div className="min-w-0 space-y-4">
            <Field id="gal-alt" label="Image description (alt text)" required error={fields.alt} hint="What the photo shows, for screen readers and search engines.">
              <Input id="gal-alt" value={draft.alt} maxLength={200} invalid={!!fields.alt} onChange={(e) => set("alt", e.target.value)} aria-describedby={fields.alt ? "gal-alt-error" : "gal-alt-hint"} />
            </Field>
            <Field id="gal-caption" label="Caption" optional error={fields.caption}>
              <Input id="gal-caption" value={draft.caption} maxLength={200} invalid={!!fields.caption} onChange={(e) => set("caption", e.target.value)} />
            </Field>
            <Field id="gal-link" label="Link" optional error={fields.link} hint="A full URL starting with https://, e.g. an Instagram post.">
              <Input id="gal-link" type="url" inputMode="url" value={draft.link} maxLength={300} placeholder="https://" invalid={!!fields.link} onChange={(e) => set("link", e.target.value)} aria-describedby={fields.link ? "gal-link-error" : "gal-link-hint"} />
            </Field>
            <Field id="gal-sort" label="Sort order" error={fields.sortOrder} hint="Lower numbers appear first.">
              <Input id="gal-sort" type="number" inputMode="numeric" min={-1000} max={1000} step={1} value={draft.sortOrder} invalid={!!fields.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} aria-describedby={fields.sortOrder ? "gal-sort-error" : "gal-sort-hint"} />
            </Field>
            <Checkbox id="gal-active" checked={draft.isActive} onChange={(e) => set("isActive", e.target.checked)} label="Show on the storefront" />
          </div>
        </div>
      </form>
    </Modal>
  );
}
