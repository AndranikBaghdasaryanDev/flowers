"use client";

import { useSearchParams } from "next/navigation";
import { Link, useLocalizedRouter, useT } from "@/i18n/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input } from "@/components/ui/form";
import { PasswordInput, StrengthMeter } from "@/components/auth/password-input";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";
import { safeNext } from "@/lib/client/safe-next";

export function RegisterForm() {
  const t = useT();
  const router = useLocalizedRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { refresh } = useSession();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", acceptTerms: false, marketingOptIn: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (form.password !== form.confirmPassword) local.confirmPassword = t("validation.passwordsMismatch");
    if (!form.acceptTerms) local.acceptTerms = t("validation.termsAccount");
    if (Object.keys(local).length) {
      setFields(local);
      setError(t("validation.checkFields"));
      return;
    }
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const res = await api<{ emailDeliveryConfigured: boolean }>("/api/auth/register", { body: form });
      await refresh();
      toast.success(
        t("auth.register.readyTitle"),
        res.emailDeliveryConfigured ? t("auth.register.readyVerify") : t("auth.register.readyNoEmail"),
      );
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setFields(fieldErrors(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <Field id="name" label={t("form.fullName")} required error={fields.name}>
        <Input id="name" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} invalid={!!fields.name} />
      </Field>
      <Field id="email" label={t("form.email")} required error={fields.email}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={(e) => set("email", e.target.value)} invalid={!!fields.email} />
      </Field>
      <Field id="password" label={t("auth.password")} required error={fields.password}>
        <PasswordInput id="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} invalid={!!fields.password} />
      </Field>
      <StrengthMeter password={form.password} />
      <Field id="confirm" label={t("auth.confirmPassword")} required error={fields.confirmPassword}>
        <PasswordInput id="confirm" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} invalid={!!fields.confirmPassword} />
      </Field>
      <div className="space-y-3 pt-1">
        <Checkbox
          id="terms"
          checked={form.acceptTerms}
          onChange={(e) => set("acceptTerms", e.target.checked)}
          aria-invalid={!!fields.acceptTerms || undefined}
          label={t.rich("auth.acceptTerms", {
            terms: (c) => (
              <Link href="/legal/terms" target="_blank" className="text-brand underline">
                {c}
              </Link>
            ),
            privacy: (c) => (
              <Link href="/legal/privacy" target="_blank" className="text-brand underline">
                {c}
              </Link>
            ),
          })}
        />
        {fields.acceptTerms && <p className="text-[13px] text-danger">{fields.acceptTerms}</p>}
        <Checkbox id="news" checked={form.marketingOptIn} onChange={(e) => set("marketingOptIn", e.target.checked)} label={t("auth.marketingOptIn")} />
      </div>
      <Button type="submit" size="lg" className="w-full" loading={busy} loadingText={t("auth.register.submitting")}>
        {t("auth.createAccount")}
      </Button>
    </form>
  );
}
