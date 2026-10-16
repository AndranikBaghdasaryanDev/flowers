import { Suspense } from "react";
import type { Metadata } from "next";
import { Link } from "@/i18n/client";
import { getStoreI18n } from "@/i18n/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { Skeleton } from "@/components/ui/spinner";
import { RegisterForm } from "./register-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getStoreI18n();
  return { title: t("auth.createAnAccount"), robots: { index: false } };
}

export default async function RegisterPage() {
  const { t } = await getStoreI18n();
  return (
    <AuthShell
      title={t("auth.createAnAccount")}
      description={t("auth.register.description")}
      footer={
        <>
          {t("auth.register.haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            {t("nav.signIn")}
          </Link>
        </>
      }
    >
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
