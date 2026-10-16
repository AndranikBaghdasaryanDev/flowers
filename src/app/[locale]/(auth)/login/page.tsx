import { Suspense } from "react";
import type { Metadata } from "next";
import { Link } from "@/i18n/client";
import { getStoreI18n } from "@/i18n/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { Skeleton } from "@/components/ui/spinner";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getStoreI18n();
  return { title: t("nav.signIn"), robots: { index: false } };
}

export default async function LoginPage() {
  const { t } = await getStoreI18n();
  return (
    <AuthShell
      title={t("auth.login.title")}
      description={t("auth.login.description")}
      footer={
        <>
          {t("auth.login.newHere")}{" "}
          <Link href="/register" className="font-semibold text-brand hover:underline">
            {t("auth.createAnAccount")}
          </Link>
        </>
      }
    >
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
