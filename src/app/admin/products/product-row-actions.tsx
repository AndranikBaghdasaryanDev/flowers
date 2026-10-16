"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2, RotateCcw, Eye, EyeOff, Star } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";
import { cn } from "@/lib/cn";

export function ProductRowActions({ id, name, isActive, isFeatured, isArchived, hasImages }: { id: string; name: string; isActive: boolean; isFeatured: boolean; isArchived: boolean; hasImages: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const patch = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true);
    try {
      await api(`/api/admin/products/${id}`, { method: "PATCH", body });
      toast.success(msg);
      router.refresh();
    } catch (e) {
      toast.error("Not updated", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await api<{ result: "archived" | "deleted" }>(`/api/admin/products/${id}`, { method: "DELETE" });
      toast.success(res.result === "archived" ? `“${name}” archived` : `“${name}” deleted`, res.result === "archived" ? "It appears in past orders, so it was archived to keep order history intact." : undefined);
      setConfirm(false);
      router.refresh();
    } catch (e) {
      toast.error("Could not remove the product", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      await api(`/api/admin/products/${id}/restore`, { method: "POST" });
      toast.success("Product restored as unpublished");
      router.refresh();
    } catch (e) {
      toast.error("Could not restore", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const btn = "inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-cream hover:text-ink disabled:opacity-40";

  if (isArchived) {
    return (
      <button type="button" onClick={restore} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-brand hover:bg-brand-50">
        <RotateCcw className="h-3.5 w-3.5" /> Restore
      </button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      <button
        type="button"
        className={btn}
        disabled={busy || (!isActive && !hasImages)}
        onClick={() => patch({ isActive: !isActive }, isActive ? "Product unpublished" : "Product published")}
        aria-label={isActive ? `Unpublish ${name}` : `Publish ${name}`}
        title={!isActive && !hasImages ? "Add an image before publishing" : isActive ? "Unpublish" : "Publish"}
      >
        {isActive ? <Eye className="h-4 w-4 text-success" /> : <EyeOff className="h-4 w-4" />}
      </button>
      <button type="button" className={btn} disabled={busy} onClick={() => patch({ isFeatured: !isFeatured }, isFeatured ? "Removed from featured" : "Marked as featured")} aria-label={isFeatured ? `Unfeature ${name}` : `Feature ${name}`} aria-pressed={isFeatured} title="Featured">
        <Star className={cn("h-4 w-4", isFeatured && "fill-brand text-brand")} />
      </button>
      <Link href={`/admin/products/${id}`} className={btn} aria-label={`Edit ${name}`} title="Edit">
        <Pencil className="h-4 w-4" />
      </Link>
      <button type="button" className={cn(btn, "hover:bg-danger-50 hover:text-danger")} disabled={busy} onClick={() => setConfirm(true)} aria-label={`Delete ${name}`} title="Delete">
        <Trash2 className="h-4 w-4" />
      </button>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={remove}
        loading={busy}
        title={`Remove “${name}”?`}
        description="If this product appears in any past order it will be archived (hidden from the shop, order history kept intact). Otherwise it is deleted permanently."
        confirmLabel="Remove product"
      />
    </div>
  );
}
