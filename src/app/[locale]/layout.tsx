import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/cormorant-garamond/wght-italic.css";
import "@fontsource-variable/manrope";
import "../globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { CartProvider } from "@/components/providers/cart-provider";
import { ToastProvider } from "@/components/ui/toast";
import { SiteHeader, EMPTY_NAV, type NavData } from "@/components/store/site-header";
import { SiteFooter, SiteFooterFallback } from "@/components/store/site-footer";
import { CartDrawer } from "@/components/store/cart-drawer";
import { I18nProvider } from "@/i18n/client";
import { INTL_TAG, LOCALES, OG_LOCALE } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";
import { messages } from "@/i18n/messages";
import { getStoreI18n, getStoreLocale } from "@/i18n/server";
import { listPublicCategories } from "@/lib/services/catalog";
import { getSettings } from "@/lib/services/settings";
import { logger } from "@/lib/logger";

const appUrl = process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// Only hy, en and ru reach this layout: proxy.ts redirects any other first segment
// to a locale-prefixed URL (so /de/shop becomes /hy/de/shop, which is a 404).

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getStoreI18n();
  return {
    metadataBase: new URL(appUrl),
    title: { default: t("meta.defaultTitle"), template: `%s · ${t("brand.name")}` },
    description: t("meta.description"),
    applicationName: t("brand.name"),
    alternates: localeAlternates("/", locale),
    openGraph: { type: "website", siteName: t("brand.name"), locale: OG_LOCALE[locale], alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]) },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = { themeColor: "#fbf8f4", width: "device-width", initialScale: 1 };

async function HeaderWithData() {
  await connection();
  const locale = await getStoreLocale();
  let nav: NavData = EMPTY_NAV;
  try {
    const [cats, settings] = await Promise.all([listPublicCategories(undefined, locale), getSettings(locale)]);
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

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const { locale, t } = await getStoreI18n();
  // The storefront never needs admin, email or server strings on the client.
  const { admin: _admin, email: _email, server: _server, ...clientMessages } = messages[locale];

  return (
    <html lang={INTL_TAG[locale]} className="no-js h-full antialiased" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Marks JS as available so reveal animations can hide content until in view. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.remove('no-js')" }} />
      </head>
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale} messages={clientMessages}>
          <SessionProvider>
            <ToastProvider>
              <CartProvider>
                <a
                  href="#main"
                  className="sr-only z-[60] rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
                >
                  {t("nav.skipToContent")}
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
            </ToastProvider>
          </SessionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
