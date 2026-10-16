import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { requirePageUser } from "@/lib/auth/guards";
import { getStoreI18n } from "@/i18n/server";
import { Skeleton } from "@/components/ui/spinner";
import { AccountNav } from "./account-nav";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getStoreI18n();
  return { title: { default: t("nav.myAccount"), template: t("account.titleTemplate") }, robots: { index: false, follow: false } };
}
export const instant = false;

async function AccountGate({ children }: { children: React.ReactNode }) {
  await connection();
  const user = await requirePageUser("/account");
  const { t } = await getStoreI18n();
  return (
    <div className="container-page grid gap-8 pb-24 pt-8 sm:pt-10 lg:grid-cols-[230px_1fr] lg:gap-12">
      <div>
        <p className="hidden text-[13px] text-ink-muted lg:block">{t("account.signedInAs")}</p>
        <p className="mb-5 hidden truncate font-display text-2xl text-ink lg:block">{user.name}</p>
        <div className="lg:sticky lg:top-28">
          <AccountNav isStaff={user.isStaff} />
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function AccountLayout({ children }: LayoutProps<"/[locale]/account">) {
  return (
    <Suspense
      fallback={
        <div className="container-page grid gap-8 pb-24 pt-10 lg:grid-cols-[230px_1fr]">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-[1.5rem]" />
        </div>
      }
    >
      <AccountGate>{children}</AccountGate>
    </Suspense>
  );
}
