import type { MetadataRoute } from "next";
import { LOCALES } from "@/i18n/config";

/** Private storefront paths, blocked under every language prefix. */
const PRIVATE = ["/account", "/checkout", "/cart", "/orders/", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", ...LOCALES.flatMap((l) => PRIVATE.map((p) => `/${l}${p}`))],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
