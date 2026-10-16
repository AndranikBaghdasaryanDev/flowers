"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";
import { useT } from "@/i18n/client";

type Status = "active" | "disabled";

/** Enable / disable a customer account (requires settings:manage on the server). */
export function CustomerStatus({ id, name, status }: { id: string; name: string; status: Status }) {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const next: Status = status === "active" ? "disabled" : "active";

  const submit = async () => {
    setBusy(true);
    try {
      await api<{ status: Status }>(`/api/admin/customers/${id}`, { method: "PATCH", body: { status: next } });
      toast.success(next === "disabled" ? t("admin.customers.disabledToast") : t("admin.customers.enabledToast"));
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(t("admin.customers.notUpdated"), errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={next === "disabled" ? "hover:!border-danger hover:!text-danger" : undefined}
        icon={next === "disabled" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
        onClick={() => setOpen(true)}
      >
        {next === "disabled" ? t("admin.customers.disable") : t("admin.customers.enable")}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={submit}
        loading={busy}
        tone={next === "disabled" ? "danger" : "primary"}
        title={next === "disabled" ? t("admin.customers.disableTitle") : t("admin.customers.enableTitle")}
        confirmLabel={next === "disabled" ? t("admin.customers.disable") : t("admin.customers.enable")}
        description={
          next === "disabled"
            ? t.rich("admin.customers.disableText", { b: (c) => <strong className="text-ink">{c}</strong> }, { name })
            : t.rich("admin.customers.enableText", { b: (c) => <strong className="text-ink">{c}</strong> }, { name })
        }
      />
    </>
  );
}
