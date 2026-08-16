import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const protectedPaths = ["/dashboard", "/admin"];

function isProtectedPath(pathname: string): boolean {
  const withoutLocale = pathname.replace(/^\/(ar|en)/, "");
  return protectedPaths.some((p) => withoutLocale.startsWith(p));
}

function isAdminPath(pathname: string): boolean {
  const withoutLocale = pathname.replace(/^\/(ar|en)/, "");
  return withoutLocale.startsWith("/admin");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Explicitly skip middleware for API routes to allow route handlers to work
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);

  if (isProtectedPath(pathname) && !user) {
    const locale = pathname.startsWith("/en") ? "en" : "ar";
    const loginUrl = new URL(`/${locale}/auth`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminPath(pathname) && user) {
    // Admin check happens in page components
  }

  const intlResponse = intlMiddleware(request);
  if (intlResponse) {
    // Copy supabase cookies to the intl response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      intlResponse.cookies.set(cookie.name, cookie.value);
    });
    return intlResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Exclude API routes, static files, images, and favicon from middleware
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
