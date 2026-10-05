import { NextResponse, type NextRequest } from "next/server";
import { isLocale, isSpanishPath, localeCookieName, localeFromAcceptLanguage } from "@/lib/i18n";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieLocale = request.cookies.get(localeCookieName)?.value;
  const selectedLocale = isLocale(cookieLocale) ? cookieLocale : localeFromAcceptLanguage(request.headers.get("accept-language"));
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-sslconf-locale", isSpanishPath(pathname) ? "es" : "en");

  if ((pathname === "/" || pathname === "/check" || pathname === "/scan") && selectedLocale === "es" && !isSpanishPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/es" : `/es${pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"]
};
