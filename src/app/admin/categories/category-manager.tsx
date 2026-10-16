"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Pencil, Trash2, Wand2, ExternalLink } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ImageFallback } from "@/components/store/image-fallback";
import { ImageGalleryInput, type GalleryImage } from "@/components/admin/image-gallery-input";
import { api, ApiClientError, errorMessage, fieldErrors } from "@/lib/client/api";
import { slugify } from "@/lib/domain/slug";
import type { AdminCategoryDTO } from "@/lib/services/admin-catalog";

type Draft = {
  name: string;
  slug: string;
  kind: "collection" | "occasion";
  description: string;
  image: GalleryImage[];
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  seoTitle: string;
  seoDescription: string;
};

const toDraft = (c?: AdminCategoryDTO, kind: Draft["kind"] = "collection"): Draft =>
  c
    ? {
        name: c.name,
        slug: c.slug,
        kind: c.kind,
        description: c.description,
        image: c.image && c.imageId ? [{ media: c.imageId, src: c.image.src, width: c.image.width, height: c.image.height, alt: c.imageAlt }] : [],
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        isFeatured: c.isFeatured,
        seoTitle: c.seoTitle,
        seoDescription: c.seoDescription,
      }
    : { name: "", slug: "", kind, description: "", image: [], sortOrder: 0, isActive: true, isFeatured: false, seoTitle: "", seoDescription: "" };

export function CategoryManager({ categories }: { categories: AdminCategoryDTO[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft; slugTouched: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<AdminCategoryDTO | null>(null);
  const [reassignTo, setReassignTo] = useState("");

  const collections = categories.filter((c) => c.kind === "collection");
  const occasions = categories.filter((c) => c.kind === "occasion");

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setEditing((e) => {
      if (!e) return e;
      const draft = { ...e.draft, [k]: v };
      if (k === "name" && !e.slugTouched) draft.slug = slugify(String(v));
      return { ...e, draft, slugTouched: k === "slug" ? true : e.slugTouched };
    });

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    setFields({});
    const d = editing.draft;
    const body = {
      name: d.name,
      slug: d.slug,
      kind: d.kind,
      description: d.description,
      image: d.image[0]?.media ?? null,
      imageAlt: d.image[0]?.alt || d.name,
      sortOrder: d.sortOrder,
      isActive: d.isActive,
      isFeatured: d.isFeatured,
      seoTitle: d.seoTitle,
      seoDescription: d.seoDescription,
    };
    try {
      await api(editing.id ? `/api/admin/categories/${editing.id}` : "/api/admin/categories", { method: editing.id ? "PUT" : "POST", body });
      toast.success(editing.id ? "Category saved" : "Category created");
      setEditing(null);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setFields(fieldErrors(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/categories/${deleting.id}${reassignTo ? `?reassignTo=${reassignTo}` : ""}`, { method: "DELETE" });
      toast.success(`“${deleting.name}” deleted`);
      setDeleting(null);
      setReassignTo("");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const list = (items: AdminCategoryDTO[], kind: Draft["kind"]) => (
    <Panel
      title={kind === "collection" ? "Collections" : "Occasions"}
      description={kind === "collection" ? "Every product belongs to one main collection." : "Optional tags used for “shop by occasion”."}
      actions={
        <Button size="sm" variant="soft" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ id: null, draft: toDraft(undefined, kind), slugTouched: false })}>
          Add {kind === "collection" ? "collection" : "occasion"}
        </Button>
      }
      padded={false}
    >
      {items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-ink-muted">None yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
              <span className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-cream">
                {c.image ? <Image src={c.image.src} alt="" fill sizes="48px" className="object-cover" /> : <ImageFallback />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{c.name}</p>
                <p className="text-xs text-ink-muted">
                  /categories/{c.slug} · {c.productCount} {c.productCount === 1 ? "product" : "products"} · order {c.sortOrder}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {c.isActive ? <Badge tone="success">Visible</Badge> : <Badge tone="neutral">Hidden</Badge>}
                {c.isFeatured && <Badge tone="brand">Featured</Badge>}
                {c.isSample && <Badge tone="info">Sample</Badge>}
              </div>
              <div className="flex gap-0.5">
                <a href={`/categories/${c.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-cream hover:text-ink" aria-label={`Preview ${c.name}`} title="Preview">
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button type="button" onClick={() => setEditing({ id: c.id, draft: toDraft(c), slugTouched: true })} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-cream hover:text-ink" aria-label={`Edit ${c.name}`}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setReassignTo("");
                    setDeleting(c);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-danger-50 hover:text-danger"
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );

  const d = editing?.draft;
  return (
    <div className="space-y-6">
      {list(collections, "collection")}
      {list(occasions, "occasion")}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit category" : `New ${d?.kind === "occasion" ? "occasion" : "collection"}`}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} loading={busy}>
              Save
            </Button>
          </div>
        }
      >
        {d && (
          <div className="space-y-4">
            <FormError message={error} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="c-name" label="Name" required error={fields.name}>
                <Input id="c-name" value={d.name} onChange={(e) => set("name", e.target.value)} invalid={!!fields.name} />
              </Field>
              <Field id="c-slug" label="URL slug" required error={fields.slug}>
                <div className="flex gap-2">
                  <Input id="c-slug" value={d.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} invalid={!!fields.slug} />
                  <Button variant="outline" size="icon" onClick={() => set("slug", slugify(d.name))} aria-label="Generate slug">
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </div>
              </Field>
              <Field id="c-kind" label="Type">
                <Select id="c-kind" value={d.kind} onChange={(e) => set("kind", e.target.value as Draft["kind"])}>
                  <option value="collection">Collection (main category)</option>
                  <option value="occasion">Occasion</option>
                </Select>
              </Field>
              <Field id="c-order" label="Display order" hint="Lower numbers appear first.">
                <Input id="c-order" type="number" value={d.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} />
              </Field>
              <Field id="c-desc" label="Description" optional className="sm:col-span-2">
                <Textarea id="c-desc" rows={3} maxLength={1000} value={d.description} onChange={(e) => set("description", e.target.value)} />
              </Field>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink">Image</p>
              <div className="max-w-[220px]">
                <ImageGalleryInput value={d.image} onChange={(v) => set("image", v)} max={1} purpose="category" defaultAlt={d.name} />
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <Checkbox id="c-active" checked={d.isActive} onChange={(e) => set("isActive", e.target.checked)} label="Visible in the shop" />
              <Checkbox id="c-feat" checked={d.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} label="Featured on the homepage" />
            </div>
            <details className="rounded-xl border border-line px-4 py-2">
              <summary className="cursor-pointer py-1 text-sm font-semibold text-ink">Search engine settings</summary>
              <div className="mt-3 grid gap-4 pb-2">
                <Field id="c-seot" label="SEO title" optional>
                  <Input id="c-seot" maxLength={120} value={d.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
                </Field>
                <Field id="c-seod" label="SEO description" optional>
                  <Textarea id="c-seod" rows={2} maxLength={300} value={d.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} />
                </Field>
              </div>
            </details>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Delete “${deleting?.name ?? ""}”?`}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} loading={busy} disabled={Boolean(deleting && deleting.primaryProductCount > 0 && !reassignTo)}>
              Delete category
            </Button>
          </div>
        }
      >
        {deleting && (
          <div className="space-y-4 text-sm text-ink-soft">
            <FormError message={error} />
            <p>Products are never deleted with a category.</p>
            {deleting.primaryProductCount > 0 ? (
              <>
                <p>
                  <strong className="text-ink">{deleting.primaryProductCount}</strong> product{deleting.primaryProductCount === 1 ? " uses" : "s use"} this as their main collection. Choose where to move them:
                </p>
                <Select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)} aria-label="Move products to">
                  <option value="">Choose a collection…</option>
                  {collections
                    .filter((c) => c.id !== deleting.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </Select>
              </>
            ) : deleting.productCount > 0 ? (
              <p>The occasion tag will be removed from {deleting.productCount} product(s).</p>
            ) : (
              <p>No products use this category.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
