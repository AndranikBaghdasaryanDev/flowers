import type { Metadata } from "next";
import { PageHeader } from "@/components/store/page-header";
import { getStoreI18n } from "@/i18n/server";
import { CartView } from "./cart-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getStoreI18n();
  return { title: t("cart.title"), robots: { index: false } };
}

export default async function CartPage() {
  const { t } = await getStoreI18n();
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.home"), href: "/" }, { label: t("cart.bag") }]} title={t("cart.title")} />
      <div className="container-page pb-24">
        <CartView />
      </div>
    </>
  );
}
