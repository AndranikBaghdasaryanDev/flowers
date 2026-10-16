"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/form";
import { PasswordInput, StrengthMeter } from "@/components/auth/password-input";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";

export default function SecurityPage() {
  const t = useT();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", password: "", confirmPassword: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setFields({ confirmPassword: t("validation.passwordsMismatch") });
      return;
    }
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await api("/api/account/password", { body: form });
      setForm({ currentPassword: "", password: "", confirmPassword: "" });
      toast.success(t("account.security.changed"), t("account.security.changedText"));
    } catch (err) {
      setError(errorMessage(err));
      setFields(fieldErrors(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-[2.4rem] leading-tight text-ink">{t("account.nav.security")}</h1>
      <p className="mb-6 mt-1 text-sm text-ink-muted">{t("account.security.subtitle")}</p>
      <form onSubmit={submit} noValidate className="space-y-5 rounded-[1.5rem] border border-line bg-paper p-6">
        <FormError message={error} />
        <Field id="cur" label={t("auth.currentPassword")} required error={fields.currentPassword}>
          <PasswordInput id="cur" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} invalid={!!fields.currentPassword} />
        </Field>
        <Field id="new" label={t("auth.newPassword")} required error={fields.password}>
          <PasswordInput id="new" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} invalid={!!fields.password} />
        </Field>
        <StrengthMeter password={form.password} />
        <Field id="new2" label={t("auth.confirmNewPassword")} required error={fields.confirmPassword}>
          <PasswordInput id="new2" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} invalid={!!fields.confirmPassword} />
        </Field>
        <Button type="submit" loading={busy}>
          {t("account.security.submit")}
        </Button>
      </form>
    </div>
  );
}
