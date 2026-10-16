"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/form";
import { PasswordInput, StrengthMeter } from "@/components/auth/password-input";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";

export function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
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
        This reset link is incomplete.{" "}
        <Link href="/forgot-password" className="font-semibold text-brand hover:underline">
          Request a new one
        </Link>
        .
      </p>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setFields({ confirmPassword: "Passwords do not match." });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/reset-password", { body: { token, password, confirmPassword } });
      await refresh();
      toast.success("Your password has been changed", "All other sessions have been signed out.");
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
      <Field id="pw" label="New password" required error={fields.password}>
        <PasswordInput id="pw" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!fields.password} />
      </Field>
      <StrengthMeter password={password} />
      <Field id="pw2" label="Confirm new password" required error={fields.confirmPassword}>
        <PasswordInput id="pw2" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirm(e.target.value)} invalid={!!fields.confirmPassword} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        Save new password
      </Button>
    </form>
  );
}
