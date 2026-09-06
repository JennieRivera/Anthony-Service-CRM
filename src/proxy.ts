import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { auth } from "@/auth";
import { canAccessRoute, type Role } from "@/lib/permissions";

const handleI18nRouting = createMiddleware(routing);

const isPublicPath = (pathname: string) =>
  /^\/(en|es)\/login(\/.*)?$/.test(pathname);

// Strips the /en or /es prefix so route rules in permissions.ts don't
// need to know about locales at all.
function delocalize(pathname: string): string {
  return pathname.replace(/^\/(en|es)(?=\/|$)/, "") || "/";
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (!req.auth && !isPublicPath(pathname)) {
    const locale = pathname.startsWith("/es")
      ? "es"
      : routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/login`, req.nextUrl.origin));
  }

  if (req.auth && !isPublicPath(pathname)) {
    const role = (req.auth.user?.role ?? null) as Role | null;
    if (!canAccessRoute(role, delocalize(pathname))) {
      const locale = pathname.startsWith("/es") ? "es" : routing.defaultLocale;
      return NextResponse.redirect(new URL(`/${locale}`, req.nextUrl.origin));
    }
  }

  return handleI18nRouting(req);
});

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
