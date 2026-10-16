"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { useT } from "@/i18n/client";
import { AuthShell } from "@/components/auth/auth-shell";
import { LinkButton } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "@/components/providers/session-provider";
import { api, errorMessage } from "@/lib/client/api";

function Verify() {
  const t = useT();
  const token = useSearchParams().get("token") ?? "";
  const { refresh } = useSession();
  const [state, setState] = useState<"loading" | "ok" | "error">(token ? "loading" : "error");
  const [message, setMessage] = useState(token ? "" : t("auth.verify.incomplete"));
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    api("/api/auth/verify-email", { body: { token } })
      .then(() => {
        setState("ok");
        void refresh();
      })
      .catch((e) => {
        setState("error");
        setMessage(errorMessage(e));
      });
  }, [token, refresh]);

  if (state === "loading") return <p className="flex items-center justify-center gap-2 text-ink-soft"><Spinner className="h-5 w-5 text-brand" /> {t("auth.verify.confirming")}</p>;
  return (
    <div className="text-center" role="status">
      {state === "ok" ? <CheckCircle2 className="mx-auto h-10 w-10 text-success" /> : <XCircle className="mx-auto h-10 w-10 text-danger" />}
      <p className="mt-4 text-[15px] text-ink-soft">{state === "ok" ? t("auth.verify.confirmed") : message}</p>
      <LinkButton href="/account" className="mt-6">
        {t("auth.verify.goToAccount")}
      </LinkButton>
    </div>
  );
}

export default function VerifyEmailPage() {
  const t = useT();
  return (
    <AuthShell title={t("auth.verify.title")}>
      <Suspense fallback={<Spinner className="mx-auto h-6 w-6 text-brand" />}>
        <Verify />
      </Suspense>
    </AuthShell>
  );
}
