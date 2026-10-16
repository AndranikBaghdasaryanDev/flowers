"use client";

import { useState } from "react";
import { MailWarning, MailCheck } from "lucide-react";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/components/providers/session-provider";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";

type Profile = { email: string; name: string; phone: string; marketingOptIn: boolean; emailVerified: boolean };

export function ProfileForm({ initial }: { initial: Profile }) {
  const t = useT();
  const toast = useToast();
  const { refresh } = useSession();
  const [form, setForm] = useState({ name: initial.name, phone: initial.phone, marketingOptIn: initial.marketingOptIn });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [resending, setResending] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await api("/api/account/profile", { method: "PATCH", body: form });
      await refresh();
      toast.success(t("account.profileSaved"));
    } catch (err) {
      setError(errorMessage(err));
      setFields(fieldErrors(err));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      const res = await api<{ alreadyVerified: boolean; emailDeliveryConfigured: boolean }>("/api/auth/verify-email", { method: "PUT" });
      if (res.alreadyVerified) toast.info(t("account.emailAlreadyConfirmed"));
      else if (res.emailDeliveryConfigured) toast.success(t("account.confirmationSent"), t("account.checkInbox", { email: initial.email }));
      else toast.info(t("account.emailNotSetUp"), t("account.emailNotSetUpText"));
    } catch (err) {
      toast.error(t("account.emailSendFailed"), errorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="p-name" label={t("form.fullName")} required error={fields.name}>
          <Input id="p-name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!fields.name} />
        </Field>
        <Field id="p-phone" label={t("form.phone")} optional error={fields.phone}>
          <Input id="p-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} invalid={!!fields.phone} />
        </Field>
        <Field id="p-email" label={t("form.email")} hint={t("account.emailChangeHint")} className="sm:col-span-2">
          <Input id="p-email" value={initial.email} readOnly disabled />
        </Field>
      </div>
      <div className={initial.emailVerified ? "flex items-center gap-2 text-sm text-success" : "flex flex-wrap items-center gap-3 rounded-xl bg-warning-50 px-4 py-3 text-sm text-warning"}>
        {initial.emailVerified ? (
          <>
            <MailCheck className="h-4 w-4" /> {t("account.emailConfirmed")}
          </>
        ) : (
          <>
            <MailWarning className="h-4 w-4" /> {t("account.emailNotConfirmed")}
            <button type="button" onClick={resend} disabled={resending} className="font-semibold underline disabled:opacity-50">
              {resending ? t("account.sending") : t("account.sendConfirmation")}
            </button>
          </>
        )}
      </div>
      <Checkbox id="p-news" checked={form.marketingOptIn} onChange={(e) => setForm({ ...form, marketingOptIn: e.target.checked })} label={t("auth.marketingOptIn")} />
      <Button type="submit" loading={busy}>
        {t("account.saveChanges")}
      </Button>
    </form>
  );
}
