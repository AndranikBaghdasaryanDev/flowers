"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input } from "@/components/ui/form";
import { PasswordInput, StrengthMeter } from "@/components/auth/password-input";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";
import { safeNext } from "@/lib/client/safe-next";

export function RegisterForm() {
  const router = useRouter();
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
    if (form.password !== form.confirmPassword) local.confirmPassword = "Passwords do not match.";
    if (!form.acceptTerms) local.acceptTerms = "Please accept the terms to create an account.";
    if (Object.keys(local).length) {
      setFields(local);
      setError("Please check the highlighted fields.");
      return;
    }
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const res = await api<{ emailDeliveryConfigured: boolean }>("/api/auth/register", { body: form });
      await refresh();
      toast.success(
        "Your account is ready",
        res.emailDeliveryConfigured ? "We sent a link to confirm your email address." : "Email confirmation will be available once the shop enables email.",
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
      <Field id="name" label="Full name" required error={fields.name}>
        <Input id="name" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} invalid={!!fields.name} />
      </Field>
      <Field id="email" label="Email" required error={fields.email}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={(e) => set("email", e.target.value)} invalid={!!fields.email} />
      </Field>
      <Field id="password" label="Password" required error={fields.password}>
        <PasswordInput id="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} invalid={!!fields.password} />
      </Field>
      <StrengthMeter password={form.password} />
      <Field id="confirm" label="Confirm password" required error={fields.confirmPassword}>
        <PasswordInput id="confirm" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} invalid={!!fields.confirmPassword} />
      </Field>
      <div className="space-y-3 pt-1">
        <Checkbox
          id="terms"
          checked={form.acceptTerms}
          onChange={(e) => set("acceptTerms", e.target.checked)}
          aria-invalid={!!fields.acceptTerms || undefined}
          label={
            <>
              I accept the{" "}
              <Link href="/legal/terms" target="_blank" className="text-brand underline">terms</Link> and{" "}
              <Link href="/legal/privacy" target="_blank" className="text-brand underline">privacy policy</Link>
            </>
          }
        />
        {fields.acceptTerms && <p className="text-[13px] text-danger">{fields.acceptTerms}</p>}
        <Checkbox id="news" checked={form.marketingOptIn} onChange={(e) => set("marketingOptIn", e.target.checked)} label="Send me seasonal news and new compositions" />
      </div>
      <Button type="submit" size="lg" className="w-full" loading={busy} loadingText="Creating account…">
        Create account
      </Button>
    </form>
  );
}
