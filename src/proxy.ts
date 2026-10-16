import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect for protected areas when no session cookie is present.
 * This is only a UX shortcut — every page and API route verifies the session and
 * permissions on the server.
 */
export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get("ff_session")?.value);
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
