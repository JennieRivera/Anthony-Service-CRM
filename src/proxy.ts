import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { auth } from "@/auth";

const handleI18nRouting = createMiddleware(routing);

const isPublicPath = (pathname: string) =>
  /^\/(en|es)\/login(\/.*)?$/.test(pathname);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (!req.auth && !isPublicPath(pathname)) {
    const locale = pathname.startsWith("/es")
      ? "es"
      : routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/login`, req.nextUrl.origin));
  }

  return handleI18nRouting(req);
});

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
