"use client";

import { Link, useT } from "@/i18n/client";
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
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const patch = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true);
    try {
      await api(`/api/admin/products/${id}`, { method: "PATCH", body });
      toast.success(msg);
      router.refresh();
    } catch (e) {
      toast.error(t("admin.products.notUpdated"), errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await api<{ result: "archived" | "deleted" }>(`/api/admin/products/${id}`, { method: "DELETE" });
      toast.success(
        res.result === "archived" ? t("admin.products.archivedToast", { name }) : t("admin.products.deletedToast", { name }),
        res.result === "archived" ? t("admin.products.archivedHint") : undefined,
      );
      setConfirm(false);
      router.refresh();
    } catch (e) {
      toast.error(t("admin.products.removeFailed"), errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      await api(`/api/admin/products/${id}/restore`, { method: "POST" });
      toast.success(t("admin.products.restored"));
      router.refresh();
    } catch (e) {
      toast.error(t("admin.products.restoreFailed"), errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const btn = "inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-cream hover:text-ink disabled:opacity-40";

  if (isArchived) {
    return (
      <button type="button" onClick={restore} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-brand hover:bg-brand-50">
        <RotateCcw className="h-3.5 w-3.5" /> {t("admin.products.restore")}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      <button
        type="button"
        className={btn}
        disabled={busy || (!isActive && !hasImages)}
        onClick={() => patch({ isActive: !isActive }, isActive ? t("admin.products.unpublishedToast") : t("admin.products.publishedToast"))}
        aria-label={isActive ? t("admin.products.unpublishName", { name }) : t("admin.products.publishName", { name })}
        title={!isActive && !hasImages ? t("admin.products.needsImage") : isActive ? t("admin.products.unpublish") : t("admin.products.publish")}
      >
        {isActive ? <Eye className="h-4 w-4 text-success" /> : <EyeOff className="h-4 w-4" />}
      </button>
      <button type="button" className={btn} disabled={busy} onClick={() => patch({ isFeatured: !isFeatured }, isFeatured ? t("admin.products.unfeaturedToast") : t("admin.products.featuredToast"))} aria-label={isFeatured ? t("admin.products.unfeatureName", { name }) : t("admin.products.featureName", { name })} aria-pressed={isFeatured} title={t("admin.common.featured")}>
        <Star className={cn("h-4 w-4", isFeatured && "fill-brand text-brand")} />
      </button>
      <Link href={`/admin/products/${id}`} className={btn} aria-label={t("admin.common.editName", { name })} title={t("admin.common.edit")}>
        <Pencil className="h-4 w-4" />
      </Link>
      <button type="button" className={cn(btn, "hover:bg-danger-50 hover:text-danger")} disabled={busy} onClick={() => setConfirm(true)} aria-label={t("admin.common.deleteName", { name })} title={t("admin.common.delete")}>
        <Trash2 className="h-4 w-4" />
      </button>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={remove}
        loading={busy}
        title={t("admin.products.removeTitle", { name })}
        description={t("admin.products.removeText")}
        confirmLabel={t("admin.products.removeConfirm")}
      />
    </div>
  );
}
