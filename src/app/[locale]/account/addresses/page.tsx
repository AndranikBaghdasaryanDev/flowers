import type { Metadata } from "next";
import { connection } from "next/server";
import { requirePageUser } from "@/lib/auth/guards";
import { getStoreI18n } from "@/i18n/server";
import { getProfile } from "@/lib/services/account";
import { AddressBook } from "./address-book";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getStoreI18n();
  return { title: t("account.nav.addresses") };
}
export const instant = false;

export default async function AddressesPage() {
  await connection();
  const user = await requirePageUser("/account/addresses");
  const profile = await getProfile(user.id);
  const { t } = await getStoreI18n();
  return (
    <div>
      <h1 className="font-display text-[2.4rem] leading-tight text-ink">{t("account.nav.addresses")}</h1>
      <p className="mb-6 mt-1 text-sm text-ink-muted">{t("account.addresses.subtitle")}</p>
      <AddressBook initial={profile.addresses} defaultName={profile.name} defaultPhone={profile.phone} />
    </div>
  );
}
