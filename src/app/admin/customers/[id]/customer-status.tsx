"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";

type Status = "active" | "disabled";

/** Enable / disable a customer account (requires settings:manage on the server). */
export function CustomerStatus({ id, name, status }: { id: string; name: string; status: Status }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const next: Status = status === "active" ? "disabled" : "active";

  const submit = async () => {
    setBusy(true);
    try {
      await api<{ status: Status }>(`/api/admin/customers/${id}`, { method: "PATCH", body: { status: next } });
      toast.success(next === "disabled" ? "Account disabled" : "Account enabled");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error("Account not updated", errorMessage(e));
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
        {next === "disabled" ? "Disable account" : "Enable account"}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={submit}
        loading={busy}
        tone={next === "disabled" ? "danger" : "primary"}
        title={next === "disabled" ? "Disable this account?" : "Enable this account?"}
        confirmLabel={next === "disabled" ? "Disable account" : "Enable account"}
        description={
          next === "disabled" ? (
            <>
              <strong className="text-ink">{name}</strong> will be signed out everywhere and will not be able to sign in. Their orders and details are kept, and you can enable the account again at any time.
            </>
          ) : (
            <>
              <strong className="text-ink">{name}</strong> will be able to sign in and place orders again.
            </>
          )
        }
      />
    </>
  );
}
