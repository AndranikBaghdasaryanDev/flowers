"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";
import { PasswordInput } from "@/components/auth/password-input";
import { useSession } from "@/components/providers/session-provider";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";
import { safeNext } from "@/lib/client/safe-next";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await api("/api/auth/login", { body: { email, password } });
      await refresh();
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
      <Field id="email" label="Email" error={fields.email}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!fields.email} />
      </Field>
      <Field
        id="password"
        label={
          <span className="flex w-full justify-between">
            Password
          </span>
        }
        error={fields.password}
      >
        <PasswordInput id="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!fields.password} />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-semibold text-brand hover:underline">
          Forgot your password?
        </Link>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={busy} loadingText="Signing in…">
        Sign in
      </Button>
    </form>
  );
}
