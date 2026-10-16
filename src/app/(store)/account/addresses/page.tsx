import type { Metadata } from "next";
import { connection } from "next/server";
import { requirePageUser } from "@/lib/auth/guards";
import { getProfile } from "@/lib/services/account";
import { AddressBook } from "./address-book";

export const metadata: Metadata = { title: "Addresses" };
export const instant = false;

export default async function AddressesPage() {
  await connection();
  const user = await requirePageUser("/account/addresses");
  const profile = await getProfile(user.id);
  return (
    <div>
      <h1 className="font-display text-[2.4rem] leading-tight text-ink">Addresses</h1>
      <p className="mb-6 mt-1 text-sm text-ink-muted">Saved addresses appear at checkout.</p>
      <AddressBook initial={profile.addresses} defaultName={profile.name} defaultPhone={profile.phone} />
    </div>
  );
}
