import type { Metadata } from "next";
import { PageHeader } from "@/components/store/page-header";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Your bag", robots: { index: false } };

export default function CartPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Bag" }]} title="Your bag" />
      <div className="container-page pb-24">
        <CartView />
      </div>
    </>
  );
}
