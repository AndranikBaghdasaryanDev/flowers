"use client";

import { Link, useT } from "@/i18n/client";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";

export default function ForgotPasswordPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [done, setDone] = useState<null | { emailDeliveryConfigured: boolean }>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setDone(await api<{ emailDeliveryConfigured: boolean }>("/api/auth/forgot-password", { body: { email } }));
    } catch (err) {
      setError(errorMessage(err));
      setFields(fieldErrors(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.forgot.title")}
      description={t("auth.forgot.description")}
      footer={
        <Link href="/login" className="font-semibold text-brand hover:underline">
          {t("auth.backToSignIn")}
        </Link>
      }
    >
      {done ? (
        <div className="text-center" role="status">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand">
            <MailCheck className="h-6 w-6" />
          </span>
          {done.emailDeliveryConfigured ? (
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              {t.rich("auth.forgot.sent", { strong: (c) => <strong className="text-ink">{c}</strong> }, { email })}
            </p>
          ) : (
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{t("auth.forgot.noEmail")}</p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <FormError message={error} />
          <Field id="email" label={t("form.email")} required error={fields.email}>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!fields.email} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            {t("auth.forgot.submit")}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
