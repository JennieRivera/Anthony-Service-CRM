import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { auth } from "@/auth";

const handleI18nRouting = createMiddleware(routing);

const isPublicPath = (pathname: string) =>
  /^\/(en|es)\/login(\/.*)?$/.test(pathname);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // A Server Action can be invoked by POSTing its action ID (the
  // `Next-Action` header) to ANY page route, not just the page that uses
  // it — so a public page would otherwise be a way to reach every admin
  // action without passing the login check below. No public page uses
  // Server Actions (login uses Auth.js's /api/auth routes), so they are
  // refused outright here. Defense in depth only: every Server Action
  // also re-checks the session itself (see requireAuthenticatedUser).
  if (isPublicPath(pathname) && req.headers.has("next-action")) {
    return new NextResponse(null, { status: 403 });
  }

  // Must check for an actual signed-in user, not just a truthy req.auth:
  // when Auth.js hits a configuration error (e.g. UntrustedHost), it sets
  // req.auth to the error body ({ message: "..." }), which a bare
  // `!req.auth` check would have treated as a valid session — fail open.
  const isSignedIn = Boolean(req.auth?.user?.email);

  if (!isSignedIn && !isPublicPath(pathname)) {
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
