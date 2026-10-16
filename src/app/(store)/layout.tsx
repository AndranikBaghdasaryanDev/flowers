import { Suspense } from "react";
import { connection } from "next/server";
import { CartProvider } from "@/components/providers/cart-provider";
import { SiteHeader, EMPTY_NAV, type NavData } from "@/components/store/site-header";
import { SiteFooter, SiteFooterFallback } from "@/components/store/site-footer";
import { CartDrawer } from "@/components/store/cart-drawer";
import { listPublicCategories } from "@/lib/services/catalog";
import { getSettings } from "@/lib/services/settings";
import { logger } from "@/lib/logger";

async function HeaderWithData() {
  await connection();
  let nav: NavData = EMPTY_NAV;
  try {
    const [cats, settings] = await Promise.all([listPublicCategories(), getSettings()]);
    nav = {
      collections: cats.filter((c) => c.kind === "collection").map((c) => ({ name: c.name, slug: c.slug, image: c.image })),
      occasions: cats.filter((c) => c.kind === "occasion").map((c) => ({ name: c.name, slug: c.slug, image: c.image })),
      announcement: settings.content.announcement,
    };
  } catch (error) {
    // The header must render even if the database is briefly unavailable.
    logger.error("header data failed", { error });
  }
  return <SiteHeader nav={nav} />;
}

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <CartProvider>
      <a
        href="#main"
        className="sr-only z-[60] rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Suspense fallback={<SiteHeader nav={EMPTY_NAV} />}>
        <HeaderWithData />
      </Suspense>
      <main id="main" className="flex-1">
        {children}
      </main>
      <Suspense fallback={<SiteFooterFallback />}>
        <SiteFooter />
      </Suspense>
      <CartDrawer />
    </CartProvider>
  );
}
