import type { Metadata } from "next";
import { PageHeader } from "@/components/store/page-header";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Bag", href: "/cart" }, { label: "Checkout" }]} title="Checkout" />
      <div className="container-page pb-24">
        <CheckoutForm />
      </div>
    </>
  );
}
