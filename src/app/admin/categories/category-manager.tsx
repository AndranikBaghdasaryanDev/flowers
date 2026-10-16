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
import type { I18nOverrides } from "@/lib/models/_util";
import type { CategoryText } from "@/lib/models/catalog";
import { TranslationTabs, translationFields } from "@/components/admin/translation-tabs";
import { useLocale, useT } from "@/i18n/client";

type Draft = {
  i18n: I18nOverrides<CategoryText>;
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
        i18n: c.i18n,
      }
    : { name: "", slug: "", kind, description: "", image: [], sortOrder: 0, isActive: true, isFeatured: false, seoTitle: "", seoDescription: "", i18n: {} };

export function CategoryManager({ categories }: { categories: AdminCategoryDTO[] }) {
  const t = useT();
  const locale = useLocale();
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
      i18n: d.i18n,
    };
    try {
      await api(editing.id ? `/api/admin/categories/${editing.id}` : "/api/admin/categories", { method: editing.id ? "PUT" : "POST", body });
      toast.success(editing.id ? t("admin.categories.saved") : t("admin.categories.created"));
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
      toast.success(t("admin.categories.deleted", { name: deleting.name }));
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
      title={kind === "collection" ? t("admin.categories.collections") : t("admin.categories.occasions")}
      description={kind === "collection" ? t("admin.categories.collectionsHint") : t("admin.categories.occasionsHint")}
      actions={
        <Button size="sm" variant="soft" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ id: null, draft: toDraft(undefined, kind), slugTouched: false })}>
          {kind === "collection" ? t("admin.categories.addCollection") : t("admin.categories.addOccasion")}
        </Button>
      }
      padded={false}
    >
      {items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-ink-muted">{t("admin.categories.none")}</p>
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
                  /categories/{c.slug} · {t("admin.categories.productCount", { count: c.productCount })} · {t("admin.categories.orderN", { n: c.sortOrder })}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {c.isActive ? <Badge tone="success">{t("admin.common.visible")}</Badge> : <Badge tone="neutral">{t("admin.common.hidden")}</Badge>}
                {c.isFeatured && <Badge tone="brand">{t("admin.common.featured")}</Badge>}
                {c.isSample && <Badge tone="info">{t("admin.common.sample")}</Badge>}
              </div>
              <div className="flex gap-0.5">
                <a href={`/${locale}/categories/${c.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-cream hover:text-ink" aria-label={t("admin.common.previewName", { name: c.name })} title={t("admin.common.preview")}>
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button type="button" onClick={() => setEditing({ id: c.id, draft: toDraft(c), slugTouched: true })} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-cream hover:text-ink" aria-label={t("admin.common.editName", { name: c.name })}>
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
                  aria-label={t("admin.common.deleteName", { name: c.name })}
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
  const translated = d
    ? translationFields(d.i18n, (fn) => setEditing((e) => e && { ...e, draft: { ...e.draft, i18n: fn(e.draft.i18n) } }), [
        { key: "name", label: t("admin.common.name"), base: d.name, maxLength: 80 },
        { key: "description", label: t("admin.common.description"), base: d.description, rows: 3, maxLength: 1000 },
        { key: "imageAlt", label: t("admin.i18n.imageAltText"), base: d.image[0] ? d.image[0].alt || d.name : "", maxLength: 200 },
        { key: "seoTitle", label: t("admin.common.seoTitle"), base: d.seoTitle, maxLength: 120, group: t("admin.common.seoSettings") },
        { key: "seoDescription", label: t("admin.common.seoDescription"), base: d.seoDescription, rows: 2, maxLength: 300, group: t("admin.common.seoSettings") },
      ])
    : [];
  return (
    <div className="space-y-6">
      {list(collections, "collection")}
      {list(occasions, "occasion")}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? t("admin.categories.edit") : d?.kind === "occasion" ? t("admin.categories.newOccasion") : t("admin.categories.newCollection")}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={save} loading={busy}>
              {t("admin.common.save")}
            </Button>
          </div>
        }
      >
        {d && (
          <div className="space-y-4">
            <FormError message={error} />
            <TranslationTabs fields={translated} errors={fields}>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="c-name" label={t("admin.common.name")} required error={fields.name}>
                    <Input id="c-name" value={d.name} onChange={(e) => set("name", e.target.value)} invalid={!!fields.name} />
                  </Field>
                  <Field id="c-slug" label={t("admin.common.slug")} required error={fields.slug}>
                    <div className="flex gap-2">
                      <Input id="c-slug" value={d.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} invalid={!!fields.slug} />
                      <Button variant="outline" size="icon" onClick={() => set("slug", slugify(d.name))} aria-label={t("admin.common.generateSlug")}>
                        <Wand2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Field>
                  <Field id="c-kind" label={t("admin.categories.type")}>
                    <Select id="c-kind" value={d.kind} onChange={(e) => set("kind", e.target.value as Draft["kind"])}>
                      <option value="collection">{t("admin.categories.typeCollection")}</option>
                      <option value="occasion">{t("admin.categories.typeOccasion")}</option>
                    </Select>
                  </Field>
                  <Field id="c-order" label={t("admin.common.displayOrder")} hint={t("admin.common.displayOrderHint")}>
                    <Input id="c-order" type="number" value={d.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} />
                  </Field>
                  <Field id="c-desc" label={t("admin.common.description")} optional className="sm:col-span-2">
                    <Textarea id="c-desc" rows={3} maxLength={1000} value={d.description} onChange={(e) => set("description", e.target.value)} />
                  </Field>
                </div>
                <div>
                  <p className="mb-2 text-[13px] font-semibold text-ink">{t("admin.common.image")}</p>
                  <div className="max-w-[220px]">
                    <ImageGalleryInput value={d.image} onChange={(v) => set("image", v)} max={1} purpose="category" defaultAlt={d.name} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-6">
                  <Checkbox id="c-active" checked={d.isActive} onChange={(e) => set("isActive", e.target.checked)} label={t("admin.categories.visibleInShop")} />
                  <Checkbox id="c-feat" checked={d.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} label={t("admin.categories.featuredHome")} />
                </div>
                <details className="rounded-xl border border-line px-4 py-2">
                  <summary className="cursor-pointer py-1 text-sm font-semibold text-ink">{t("admin.common.seoSettings")}</summary>
                  <div className="mt-3 grid gap-4 pb-2">
                    <Field id="c-seot" label={t("admin.common.seoTitle")} optional>
                      <Input id="c-seot" maxLength={120} value={d.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
                    </Field>
                    <Field id="c-seod" label={t("admin.common.seoDescription")} optional>
                      <Textarea id="c-seod" rows={2} maxLength={300} value={d.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} />
                    </Field>
                  </div>
                </details>
              </div>
            </TranslationTabs>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={t("admin.categories.deleteTitle", { name: deleting?.name ?? "" })}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={remove} loading={busy} disabled={Boolean(deleting && deleting.primaryProductCount > 0 && !reassignTo)}>
              {t("admin.categories.deleteButton")}
            </Button>
          </div>
        }
      >
        {deleting && (
          <div className="space-y-4 text-sm text-ink-soft">
            <FormError message={error} />
            <p>{t("admin.categories.deleteNote")}</p>
            {deleting.primaryProductCount > 0 ? (
              <>
                <p>
                  {t.rich(
                    "admin.categories.reassignText",
                    { b: (c) => <strong className="text-ink">{c}</strong> },
                    { count: deleting.primaryProductCount },
                  )}
                </p>
                <Select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)} aria-label={t("admin.categories.moveTo")}>
                  <option value="">{t("admin.categories.chooseCollection")}</option>
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
              <p>{t("admin.categories.occasionRemoved", { count: deleting.productCount })}</p>
            ) : (
              <p>{t("admin.categories.noProducts")}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
