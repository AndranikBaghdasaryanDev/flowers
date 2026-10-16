import type { Metadata } from "next";
import { PageHeader } from "@/components/store/page-header";
import { getStoreI18n } from "@/i18n/server";
import { CheckoutForm } from "./checkout-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getStoreI18n();
  return { title: t("checkout.title"), robots: { index: false, follow: false } };
}

export default async function CheckoutPage() {
  const { t } = await getStoreI18n();
  return (
    <>
      <PageHeader crumbs={[{ label: t("cart.bag"), href: "/cart" }, { label: t("checkout.title") }]} title={t("checkout.title")} />
      <div className="container-page pb-24">
        <CheckoutForm />
      </div>
    </>
  );
}
