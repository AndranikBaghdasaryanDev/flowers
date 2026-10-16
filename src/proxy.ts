import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, isLocale, negotiateLocale } from "@/i18n/config";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * 1. Storefront URLs without a language prefix are redirected to the visitor's
 *    language (saved choice → browser preference → Armenian).
 * 2. The language of every storefront page is remembered in a cookie, which the API
 *    and the admin panel also use.
 * 3. Optimistic redirect to sign-in for /account and /admin without a session cookie.
 *    This is only a UX shortcut — every page and API route verifies access on the server.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("ff_session")?.value);
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const preferred = isLocale(saved) ? saved : negotiateLocale(request.headers.get("accept-language"));

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (hasSession) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = `/${preferred}/login`;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const first = pathname.split("/")[1];
  if (!isLocale(first)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  if (/^\/(hy|en|ru)\/account(\/|$)/.test(pathname) && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = `/${first}/login`;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  // Only a page the visitor actually opened may change the saved language. Link prefetches
  // (e.g. of the language switcher's /ru/… links) are fetches with Sec-Fetch-Dest "empty";
  // in-app switches save the choice client-side (see LanguageSwitcher).
  const dest = request.headers.get("sec-fetch-dest");
  if (saved !== first && (dest === null || dest === "document")) {
    response.cookies.set(LOCALE_COOKIE, first, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
  }
  return response;
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
