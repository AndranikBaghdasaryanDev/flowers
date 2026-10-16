"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-50 text-danger">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <h1 className="mt-6 font-display text-4xl text-ink">Something went wrong</h1>
      <p className="mt-3 max-w-md text-ink-soft">We could not load this page right now. Please try again in a moment.</p>
      {error.digest && <p className="mt-2 text-xs text-ink-muted">Reference: {error.digest}</p>}
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <LinkButton href="/" variant="outline">
          Home
        </LinkButton>
      </div>
    </div>
  );
}
