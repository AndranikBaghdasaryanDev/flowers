"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLink, Wand2, X } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { ImageGalleryInput, type GalleryImage } from "@/components/admin/image-gallery-input";
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
};

type Option = { id: string; name: string };

function TagInput({ id, value, onChange, placeholder }: { id: string; value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])]);
    setDraft("");
  };
  return (
    <div className="rounded-xl border border-line bg-paper p-2 focus-within:border-brand">
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1.5 text-[13px] font-medium text-brand">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-brand-100" aria-label={`Remove ${t}`}>
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
    };
    try {
      if (productId) {
        await api(`/api/admin/products/${productId}`, { method: "PUT", body });
        toast.success("Product saved");
        setDirty(false);
        router.refresh();
      } else {
        const res = await api<{ id: string }>("/api/admin/products", { body });
        toast.success("Product created");
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

        <Panel title="Basic information">
          <div className="grid gap-4">
            <Field id="p-name" label="Product name" required error={err("name")}>
              <Input id="p-name" value={form.name} onChange={(e) => set("name", e.target.value)} invalid={!!err("name")} />
            </Field>
            <Field id="p-slug" label="URL slug" required error={err("slug")} hint={<>Shown as /products/<strong>{form.slug || "…"}</strong>. Changing it breaks old links.</>}>
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
                <Button variant="outline" onClick={() => set("slug", slugify(form.name))} aria-label="Generate slug from name" icon={<Wand2 className="h-4 w-4" />}>
                  <span className="hidden sm:inline">Generate</span>
                </Button>
              </div>
            </Field>
            <Field id="p-short" label="Short description" optional hint="One line shown under the title and in search results." error={err("shortDescription")}>
              <Input id="p-short" maxLength={240} value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
            </Field>
            <Field id="p-desc" label="Description" optional hint="Blank line starts a new paragraph." error={err("description")}>
              <Textarea id="p-desc" rows={6} maxLength={5000} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </div>
        </Panel>

        <Panel title="Images" description="The first image is the primary image. Alt text describes each photo for screen readers and search engines.">
          <ImageGalleryInput value={form.images} onChange={(v) => set("images", v)} defaultAlt={form.name} error={err("images")} />
        </Panel>

        <Panel title="Pricing">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="p-price" label={`Price (${currencySymbol})`} required error={err("price")}>
              <Input id="p-price" type="number" inputMode="decimal" min={0} step="any" value={form.price} onChange={(e) => set("price", e.target.value === "" ? "" : Number(e.target.value))} invalid={!!err("price")} />
            </Field>
            <Field
              id="p-compare"
              label={`Previous price (${currencySymbol})`}
              optional
              error={err("compareAtPrice")}
              hint={discount !== null ? `Shown as a ${discount}% sale. Only use for a genuine price reduction.` : "Only for a genuine reduction — shown crossed out."}
            >
              <Input id="p-compare" type="number" inputMode="decimal" min={0} step="any" value={form.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value === "" ? "" : Number(e.target.value))} invalid={!!err("compareAtPrice")} />
            </Field>
          </div>
        </Panel>

        <Panel title="Composition & attributes">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="p-comp" label="Flowers & materials" optional hint="Press Enter after each item." className="sm:col-span-2">
              <TagInput id="p-comp" value={form.composition} onChange={(v) => set("composition", v)} placeholder="Roses, eucalyptus…" />
            </Field>
            <Field id="p-colors" label="Colours" optional className="sm:col-span-2">
              <TagInput id="p-colors" value={form.colors} onChange={(v) => set("colors", v)} placeholder="Burgundy, blush…" />
            </Field>
            <Field id="p-size" label="Size" optional>
              <Input id="p-size" value={form.sizeLabel} maxLength={60} placeholder="Medium" onChange={(e) => set("sizeLabel", e.target.value)} />
            </Field>
            <Field id="p-dim" label="Dimensions" optional>
              <Input id="p-dim" value={form.dimensions} maxLength={80} placeholder="Approx. 45 cm tall" onChange={(e) => set("dimensions", e.target.value)} />
            </Field>
            <Field id="p-care" label="Care instructions" optional className="sm:col-span-2">
              <Textarea id="p-care" rows={3} maxLength={2000} value={form.careInstructions} onChange={(e) => set("careInstructions", e.target.value)} />
            </Field>
          </div>
        </Panel>

        <Panel title="Search engines" description="Optional — defaults to the product name and short description.">
          <div className="grid gap-4">
            <Field id="p-seot" label="SEO title" optional>
              <Input id="p-seot" maxLength={120} value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
            </Field>
            <Field id="p-seod" label="SEO description" optional hint={`${form.seoDescription.length}/300`}>
              <Textarea id="p-seod" rows={2} maxLength={300} value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} />
            </Field>
          </div>
        </Panel>
      </div>

      <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
        <Panel title="Visibility">
          <div className="space-y-4">
            {isArchived && <p className="rounded-xl bg-warning-50 px-3 py-2 text-[13px] text-warning">This product is archived and hidden from the shop.</p>}
            <Checkbox id="p-active" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} label="Published" description="Visible in the shop. Requires at least one image." />
            <Checkbox id="p-featured" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} label="Featured" description="Shown in “Featured compositions” on the homepage." />
            <Checkbox id="p-gift" checked={form.allowGiftMessage} onChange={(e) => set("allowGiftMessage", e.target.checked)} label="Offer gift message" />
          </div>
        </Panel>

        <Panel title="Category">
          <div className="space-y-4">
            <Field id="p-cat" label="Main collection" required error={err("category")}>
              <Select id="p-cat" value={form.category} onChange={(e) => set("category", e.target.value)} invalid={!!err("category")}>
                <option value="">Choose…</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            {occasions.length > 0 && (
              <fieldset>
                <legend className="mb-2 text-[13px] font-semibold text-ink">Occasions</legend>
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

        <Panel title="Availability & inventory">
          <div className="space-y-4">
            <Field id="p-avail" label="Availability">
              <Select id="p-avail" value={form.availability} onChange={(e) => set("availability", e.target.value as ProductFormValue["availability"])}>
                <option value="available">Available to order</option>
                <option value="unavailable">Unavailable (shown, cannot be ordered)</option>
              </Select>
            </Field>
            <Checkbox id="p-track" checked={form.trackInventory} onChange={(e) => set("trackInventory", e.target.checked)} label="Track stock quantity" description="Orders reduce stock; cancellations return it. Leave off for made-to-order bouquets." />
            {form.trackInventory && (
              <Field id="p-stock" label="In stock" required error={err("stockQuantity")}>
                <Input id="p-stock" type="number" min={0} inputMode="numeric" value={form.stockQuantity} onChange={(e) => set("stockQuantity", e.target.value === "" ? "" : Math.floor(Number(e.target.value)))} invalid={!!err("stockQuantity")} />
              </Field>
            )}
            <Field id="p-max" label="Max per order" optional hint="Leave empty to use the store default." error={err("maxPerOrder")}>
              <Input id="p-max" type="number" min={1} max={99} inputMode="numeric" value={form.maxPerOrder} onChange={(e) => set("maxPerOrder", e.target.value === "" ? "" : Math.floor(Number(e.target.value)))} />
            </Field>
          </div>
        </Panel>

        <div className="flex flex-col gap-2">
          <Button type="submit" size="lg" loading={busy} loadingText="Saving…">
            {productId ? "Save changes" : "Create product"}
          </Button>
          {productId && initial.isActive && !isArchived && (
            <Link href={`/products/${initial.slug}`} target="_blank" className="inline-flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-brand hover:underline">
              Preview in shop <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
          {dirty && <p className="text-center text-[12.5px] text-warning">You have unsaved changes.</p>}
        </div>
      </div>
    </form>
  );
}
