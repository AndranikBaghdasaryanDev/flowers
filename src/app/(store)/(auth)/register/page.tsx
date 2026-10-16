import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Skeleton } from "@/components/ui/spinner";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create an account"
      description="Track orders, save addresses and keep your favourite flowers in one place."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Sign in
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
