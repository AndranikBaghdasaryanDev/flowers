import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/manrope";
import "../globals.css";
import { requireStaffPage } from "@/lib/auth/guards";
import { AdminShell } from "@/components/admin/admin-shell";
import { SessionProvider } from "@/components/providers/session-provider";
import { ToastProvider } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/spinner";
import { I18nProvider } from "@/i18n/client";
import { INTL_TAG } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { getAdminI18n, getAdminLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAdminI18n();
  return {
    title: { default: t("admin.common.metaTitle"), template: t("admin.common.metaTitleTemplate") },
    robots: { index: false, follow: false },
  };
}
export const viewport: Viewport = { themeColor: "#2e0719", width: "device-width", initialScale: 1 };
export const instant = false;

async function AdminGate({ children }: { children: React.ReactNode }) {
  await connection();
  const { user } = await requireStaffPage("/admin");
  const locale = await getAdminLocale();
  const { email: _email, server: _server, ...clientMessages } = messages[locale];
  return (
    <I18nProvider locale={locale} messages={clientMessages} localized={false}>
      <ToastProvider>
        <div lang={INTL_TAG[locale]} className="contents">
          <AdminShell user={{ name: user.name, email: user.email, role: user.role }}>{children}</AdminShell>
        </div>
      </ToastProvider>
    </I18nProvider>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="hy" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full">
        <SessionProvider>
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
        </SessionProvider>
      </body>
    </html>
  );
}
