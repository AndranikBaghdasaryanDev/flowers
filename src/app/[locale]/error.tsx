"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-50 text-danger">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <h1 className="mt-6 font-display text-4xl text-ink">{t("error.title")}</h1>
      <p className="mt-3 max-w-md text-ink-soft">{t("error.text")}</p>
      {error.digest && <p className="mt-2 text-xs text-ink-muted">{t("error.reference", { digest: error.digest })}</p>}
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>{t("common.tryAgain")}</Button>
        <LinkButton href="/" variant="outline">
          {t("nav.home")}
        </LinkButton>
      </div>
    </div>
  );
}
