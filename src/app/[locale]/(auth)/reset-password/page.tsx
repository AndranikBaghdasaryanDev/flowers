import { Suspense } from "react";
import type { Metadata } from "next";
import { getStoreI18n } from "@/i18n/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { Skeleton } from "@/components/ui/spinner";
import { ResetForm } from "./reset-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getStoreI18n();
  return { title: t("auth.reset.title"), robots: { index: false } };
}

export default async function ResetPasswordPage() {
  const { t } = await getStoreI18n();
  return (
    <AuthShell title={t("auth.reset.title")} description={t("auth.reset.description")}>
      <Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
