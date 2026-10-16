import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { Skeleton } from "@/components/ui/spinner";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password" description="Reset links are valid for one hour and can be used once.">
      <Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
