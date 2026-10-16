"use client";

import { useSearchParams } from "next/navigation";
import { Link, useLocalizedRouter, useT } from "@/i18n/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/form";
import { PasswordInput, StrengthMeter } from "@/components/auth/password-input";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";

export function ResetForm() {
  const t = useT();
  const params = useSearchParams();
  const router = useLocalizedRouter();
  const toast = useToast();
  const { refresh } = useSession();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  if (!token) {
    return (
      <p className="text-center text-[15px] text-ink-soft">
        {t.rich("auth.reset.incomplete", {
          link: (c) => (
            <Link href="/forgot-password" className="font-semibold text-brand hover:underline">
              {c}
            </Link>
          ),
        })}
      </p>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setFields({ confirmPassword: t("validation.passwordsMismatch") });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/reset-password", { body: { token, password, confirmPassword } });
      await refresh();
      toast.success(t("auth.reset.doneTitle"), t("auth.reset.doneText"));
      router.replace("/account");
    } catch (err) {
      setError(errorMessage(err));
      setFields(fieldErrors(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <Field id="pw" label={t("auth.newPassword")} required error={fields.password}>
        <PasswordInput id="pw" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!fields.password} />
      </Field>
      <StrengthMeter password={password} />
      <Field id="pw2" label={t("auth.confirmNewPassword")} required error={fields.confirmPassword}>
        <PasswordInput id="pw2" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirm(e.target.value)} invalid={!!fields.confirmPassword} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        {t("auth.reset.submit")}
      </Button>
    </form>
  );
}
