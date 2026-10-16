"use client";

import { Link, useLocale, useT } from "@/i18n/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLink, Wand2, X } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { ImageGalleryInput, type GalleryImage } from "@/components/admin/image-gallery-input";
import { TranslationTabs, cleanList, positionalFields, translationFields } from "@/components/admin/translation-tabs";
import type { I18nOverrides } from "@/lib/models/_util";
import type { ProductText } from "@/lib/models/catalog";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";
import { slugify } from "@/lib/domain/slug";
import { cn } from "@/lib/cn";

export type ProductFormValue = {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number | "";
  compareAtPrice: number | "";
  category: string;
  occasions: string[];
  images: GalleryImage[];
  composition: string[];
  colors: string[];
  sizeLabel: string;
  dimensions: string;
  careInstructions: string;
  availability: "available" | "unavailable";
  trackInventory: boolean;
  stockQuantity: number | "";
  maxPerOrder: number | "";
  isActive: boolean;
  isFeatured: boolean;
  allowGiftMessage: boolean;
  seoTitle: string;
  seoDescription: string;
  /** Armenian / Russian overrides; `imageAlts` follows `images` by position. */
  i18n: I18nOverrides<ProductText>;
};

export const EMPTY_PRODUCT: ProductFormValue = {
  name: "",
  slug: "",
  shortDescription: "",
  description: "",
  price: "",
  compareAtPrice: "",
  category: "",
  occasions: [],
  images: [],
  composition: [],
  colors: [],
  sizeLabel: "",
  dimensions: "",
  careInstructions: "",
  availability: "available",
  trackInventory: false,
  stockQuantity: "",
  maxPerOrder: "",
  isActive: false,
  isFeatured: false,
  allowGiftMessage: true,
  seoTitle: "",
  seoDescription: "",
  i18n: {},
};

type Option = { id: string; name: string };

function TagInput({ id, value, onChange, placeholder }: { id: string; value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const t = useT();
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])]);
    setDraft("");
  };
  return (
    <div className="rounded-xl border border-line bg-paper p-2 focus-within:border-brand">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1.5 text-[13px] font-medium text-brand">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== tag))} className="rounded-full p-0.5 hover:bg-brand-100" aria-label={t("admin.products.removeTag", { tag })}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={add}
          placeholder={value.length ? "" : placeholder}
          className="h-8 min-w-[140px] flex-1 bg-transparent px-2 text-sm focus:outline-none"
        />
      </div>
    </div>
  );
}

export function ProductForm({
  productId,
  initial,
  collections,
  occasions,
  currencySymbol,
  isArchived,
}: {
  productId?: string;
  initial: ProductFormValue;
  collections: Option[];
  occasions: Option[];
  currencySymbol: string;
  isArchived?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const locale = useLocale();
  const [form, setForm] = useState<ProductFormValue>(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(productId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof ProductFormValue>(k: K, v: ProductFormValue[K]) => {
    setDirty(true);
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "name" && !slugTouched) next.slug = slugify(String(v));
      return next;
    });
  };
  const err = (k: string) => fields[k];

  const updateI18n = (fn: (prev: I18nOverrides<ProductText>) => I18nOverrides<ProductText>) => {
    setDirty(true);
    setForm((f) => ({ ...f, i18n: fn(f.i18n) }));
  };

  /** Keeps translated alt texts attached to their image when images are added, removed or reordered. */
  const setImages = (images: GalleryImage[]) => {
    setDirty(true);
    setForm((f) => {
      const i18n = { ...f.i18n };
      for (const loc of ["hy", "ru"] as const) {
        const alts = f.i18n[loc]?.imageAlts;
        if (!alts) continue;
        const byMedia = new Map(f.images.map((img, i) => [img.media, alts[i] ?? ""]));
        i18n[loc] = { ...f.i18n[loc], imageAlts: images.map((img) => byMedia.get(img.media) ?? "") };
      }
      return { ...f, images, i18n };
    });
  };

  const group = {
    basic: t("admin.products.form.basicInfo"),
    images: t("admin.products.form.images"),
    composition: t("admin.products.form.composition"),
    seo: t("admin.products.form.seo"),
  };
  const translated = [
    ...translationFields(form.i18n, updateI18n, [
      { key: "name", label: t("admin.products.form.name"), base: form.name, maxLength: 120, group: group.basic },
      { key: "shortDescription", label: t("admin.products.form.shortDescription"), base: form.shortDescription, maxLength: 240, group: group.basic },
      { key: "description", label: t("admin.common.description"), base: form.description, rows: 6, maxLength: 5000, group: group.basic },
    ]),
    ...positionalFields(
      form.i18n,
      updateI18n,
      "imageAlts",
      form.images.map((img, i) => ({ label: t("admin.i18n.imageAlt", { n: i + 1 }), base: img.alt || form.name })),
      { maxLength: 300, group: group.images },
    ),
    ...translationFields(form.i18n, updateI18n, [
      { key: "composition", label: t("admin.products.form.materials"), base: form.composition, group: group.composition },
      { key: "colors", label: t("admin.products.form.colours"), base: form.colors, group: group.composition },
      { key: "sizeLabel", label: t("admin.products.form.size"), base: form.sizeLabel, maxLength: 60, group: group.composition },
      { key: "dimensions", label: t("admin.products.form.dimensions"), base: form.dimensions, maxLength: 80, group: group.composition },
      { key: "careInstructions", label: t("admin.products.form.care"), base: form.careInstructions, rows: 3, maxLength: 2000, group: group.composition },
      { key: "seoTitle", label: t("admin.common.seoTitle"), base: form.seoTitle, maxLength: 120, group: group.seo },
      { key: "seoDescription", label: t("admin.common.seoDescription"), base: form.seoDescription, rows: 2, maxLength: 300, group: group.seo },
    ]),
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    const body = {
      ...form,
      price: form.price === "" ? undefined : Number(form.price),
      compareAtPrice: form.compareAtPrice === "" ? null : Number(form.compareAtPrice),
      stockQuantity: form.stockQuantity === "" ? null : Number(form.stockQuantity),
      maxPerOrder: form.maxPerOrder === "" ? null : Number(form.maxPerOrder),
      images: form.images.map((i) => ({ media: i.media, alt: i.alt.trim() || form.name })),
      i18n: Object.fromEntries(
        (["hy", "ru"] as const).map((loc) => {
          const block = form.i18n[loc] ?? {};
          const tr = {
            ...block,
            composition: cleanList(block.composition),
            colors: cleanList(block.colors),
            imageAlts: form.images.map((_, i) => block.imageAlts?.[i]?.trim() ?? ""),
          };
          return [loc, tr];
        }),
      ),
    };
    try {
      if (productId) {
        await api(`/api/admin/products/${productId}`, { method: "PUT", body });
        toast.success(t("admin.products.saved"));
        setDirty(false);
        router.refresh();
      } else {
        const res = await api<{ id: string }>("/api/admin/products", { body });
        toast.success(t("admin.products.created"));
        setDirty(false);
        router.replace(`/admin/products/${res.id}`);
      }
    } catch (err) {
      setError(errorMessage(err));
      setFields(fieldErrors(err));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  };

  const discount =
    form.price !== "" && form.compareAtPrice !== "" && Number(form.compareAtPrice) > Number(form.price)
      ? Math.round((1 - Number(form.price) / Number(form.compareAtPrice)) * 100)
      : null;

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-6">
        <FormError message={error} />
        <TranslationTabs fields={translated} errors={fields} asPanels>
          <div className="space-y-6">
            <Panel title={t("admin.products.form.basicInfo")}>
              <div className="grid gap-4">
                <Field id="p-name" label={t("admin.products.form.name")} required error={err("name")}>
                  <Input id="p-name" value={form.name} onChange={(e) => set("name", e.target.value)} invalid={!!err("name")} />
                </Field>
                <Field
                  id="p-slug"
                  label={t("admin.products.form.slug")}
                  required
                  error={err("slug")}
                  hint={t.rich("admin.products.form.slugHint", { b: (c) => <strong>{c}</strong> }, { slug: form.slug || "…" })}
                >
                  <div className="flex gap-2">
                    <Input
                      id="p-slug"
                      value={form.slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        set("slug", e.target.value.toLowerCase());
                      }}
                      invalid={!!err("slug")}
                    />
                    <Button variant="outline" onClick={() => set("slug", slugify(form.name))} aria-label={t("admin.products.form.generateSlug")} icon={<Wand2 className="h-4 w-4" />}>
                      <span className="hidden sm:inline">{t("admin.products.form.generate")}</span>
                    </Button>
                  </div>
                </Field>
                <Field id="p-short" label={t("admin.products.form.shortDescription")} optional hint={t("admin.products.form.shortDescriptionHint")} error={err("shortDescription")}>
                  <Input id="p-short" maxLength={240} value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
                </Field>
                <Field id="p-desc" label={t("admin.common.description")} optional hint={t("admin.products.form.descriptionHint")} error={err("description")}>
                  <Textarea id="p-desc" rows={6} maxLength={5000} value={form.description} onChange={(e) => set("description", e.target.value)} />
                </Field>
              </div>
            </Panel>

            <Panel title={t("admin.products.form.images")} description={t("admin.products.form.imagesHint")}>
              <ImageGalleryInput value={form.images} onChange={setImages} defaultAlt={form.name} error={err("images")} />
            </Panel>

            <Panel title={t("admin.products.form.pricing")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="p-price" label={t("admin.products.form.price", { currency: currencySymbol })} required error={err("price")}>
                  <Input id="p-price" type="number" inputMode="decimal" min={0} step="any" value={form.price} onChange={(e) => set("price", e.target.value === "" ? "" : Number(e.target.value))} invalid={!!err("price")} />
                </Field>
                <Field
                  id="p-compare"
                  label={t("admin.products.form.compareAtPrice", { currency: currencySymbol })}
                  optional
                  error={err("compareAtPrice")}
                  hint={discount !== null ? t("admin.products.form.compareAtSale", { discount }) : t("admin.products.form.compareAtHint")}
                >
                  <Input id="p-compare" type="number" inputMode="decimal" min={0} step="any" value={form.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value === "" ? "" : Number(e.target.value))} invalid={!!err("compareAtPrice")} />
                </Field>
              </div>
            </Panel>

            <Panel title={t("admin.products.form.composition")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="p-comp" label={t("admin.products.form.materials")} optional hint={t("admin.products.form.materialsHint")} className="sm:col-span-2">
                  <TagInput id="p-comp" value={form.composition} onChange={(v) => set("composition", v)} placeholder={t("admin.products.form.materialsPlaceholder")} />
                </Field>
                <Field id="p-colors" label={t("admin.products.form.colours")} optional className="sm:col-span-2">
                  <TagInput id="p-colors" value={form.colors} onChange={(v) => set("colors", v)} placeholder={t("admin.products.form.coloursPlaceholder")} />
                </Field>
                <Field id="p-size" label={t("admin.products.form.size")} optional>
                  <Input id="p-size" value={form.sizeLabel} maxLength={60} placeholder={t("admin.products.form.sizePlaceholder")} onChange={(e) => set("sizeLabel", e.target.value)} />
                </Field>
                <Field id="p-dim" label={t("admin.products.form.dimensions")} optional>
                  <Input id="p-dim" value={form.dimensions} maxLength={80} placeholder={t("admin.products.form.dimensionsPlaceholder")} onChange={(e) => set("dimensions", e.target.value)} />
                </Field>
                <Field id="p-care" label={t("admin.products.form.care")} optional className="sm:col-span-2">
                  <Textarea id="p-care" rows={3} maxLength={2000} value={form.careInstructions} onChange={(e) => set("careInstructions", e.target.value)} />
                </Field>
              </div>
            </Panel>

            <Panel title={t("admin.products.form.seo")} description={t("admin.products.form.seoHint")}>
              <div className="grid gap-4">
                <Field id="p-seot" label={t("admin.common.seoTitle")} optional>
                  <Input id="p-seot" maxLength={120} value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
                </Field>
                <Field id="p-seod" label={t("admin.common.seoDescription")} optional hint={`${form.seoDescription.length}/300`}>
                  <Textarea id="p-seod" rows={2} maxLength={300} value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} />
                </Field>
              </div>
            </Panel>
          </div>
        </TranslationTabs>
      </div>

      <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
        <Panel title={t("admin.products.form.visibility")}>
          <div className="space-y-4">
            {isArchived && <p className="rounded-xl bg-warning-50 px-3 py-2 text-[13px] text-warning">{t("admin.products.form.archivedNotice")}</p>}
            <Checkbox id="p-active" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} label={t("admin.products.published")} description={t("admin.products.form.publishedHint")} />
            <Checkbox id="p-featured" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} label={t("admin.common.featured")} description={t("admin.products.form.featuredHint")} />
            <Checkbox id="p-gift" checked={form.allowGiftMessage} onChange={(e) => set("allowGiftMessage", e.target.checked)} label={t("admin.products.form.giftMessage")} />
          </div>
        </Panel>

        <Panel title={t("admin.products.category")}>
          <div className="space-y-4">
            <Field id="p-cat" label={t("admin.products.form.mainCollection")} required error={err("category")}>
              <Select id="p-cat" value={form.category} onChange={(e) => set("category", e.target.value)} invalid={!!err("category")}>
                <option value="">{t("common.choose")}</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            {occasions.length > 0 && (
              <fieldset>
                <legend className="mb-2 text-[13px] font-semibold text-ink">{t("admin.products.form.occasions")}</legend>
                <div className="flex flex-wrap gap-2">
                  {occasions.map((o) => {
                    const on = form.occasions.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set("occasions", on ? form.occasions.filter((x) => x !== o.id) : [...form.occasions, o.id])}
                        className={cn("rounded-full border px-3 py-1.5 text-[13px] font-semibold", on ? "border-brand bg-brand text-white" : "border-line text-ink-soft hover:border-brand")}
                      >
                        {o.name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
          </div>
        </Panel>

        <Panel title={t("admin.products.form.availabilityInventory")}>
          <div className="space-y-4">
            <Field id="p-avail" label={t("admin.products.form.availability")}>
              <Select id="p-avail" value={form.availability} onChange={(e) => set("availability", e.target.value as ProductFormValue["availability"])}>
                <option value="available">{t("admin.products.form.availableToOrder")}</option>
                <option value="unavailable">{t("admin.products.form.unavailableShown")}</option>
              </Select>
            </Field>
            <Checkbox id="p-track" checked={form.trackInventory} onChange={(e) => set("trackInventory", e.target.checked)} label={t("admin.products.form.trackStock")} description={t("admin.products.form.trackStockHint")} />
            {form.trackInventory && (
              <Field id="p-stock" label={t("admin.products.form.inStock")} required error={err("stockQuantity")}>
                <Input id="p-stock" type="number" min={0} inputMode="numeric" value={form.stockQuantity} onChange={(e) => set("stockQuantity", e.target.value === "" ? "" : Math.floor(Number(e.target.value)))} invalid={!!err("stockQuantity")} />
              </Field>
            )}
            <Field id="p-max" label={t("admin.products.form.maxPerOrder")} optional hint={t("admin.products.form.maxPerOrderHint")} error={err("maxPerOrder")}>
              <Input id="p-max" type="number" min={1} max={99} inputMode="numeric" value={form.maxPerOrder} onChange={(e) => set("maxPerOrder", e.target.value === "" ? "" : Math.floor(Number(e.target.value)))} />
            </Field>
          </div>
        </Panel>

        <div className="flex flex-col gap-2">
          <Button type="submit" size="lg" loading={busy} loadingText={t("admin.common.saving")}>
            {productId ? t("admin.common.saveChanges") : t("admin.products.form.createProduct")}
          </Button>
          {productId && initial.isActive && !isArchived && (
            <Link href={`/${locale}/products/${initial.slug}`} target="_blank" className="inline-flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-brand hover:underline">
              {t("admin.products.form.preview")} <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
          {dirty && <p className="text-center text-[12.5px] text-warning">{t("admin.common.unsavedChanges")}</p>}
        </div>
      </div>
    </form>
  );
}
