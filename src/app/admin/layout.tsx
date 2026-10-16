import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/guards";
import { AdminShell } from "@/components/admin/admin-shell";
import { Skeleton } from "@/components/ui/spinner";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Floriani admin" },
  robots: { index: false, follow: false },
};
export const instant = false;

async function AdminGate({ children }: { children: React.ReactNode }) {
  await connection();
  const { user } = await requireStaffPage("/admin");
  return <AdminShell user={{ name: user.name, email: user.email, role: user.role }}>{children}</AdminShell>;
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh">
          <div className="hidden w-64 bg-brand-900 lg:block" />
          <div className="flex-1 space-y-4 p-8">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      }
    >
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
