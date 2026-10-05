import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { auth } from "@/auth";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal/config";

const handleI18nRouting = createMiddleware(routing);

// The ONLY routes reachable without signing in: the login page, and the
// public online-booking page (/book, plus the bare locale-less /book so
// next-intl can redirect it to /en/book or /es/book). Exact match for
// /book — no sub-paths. Its data comes from /api/public/booking/*. Also
// the public Privacy Notice (/privacy, same exact-match rule).
// The client portal (/en/portal, /es/portal and sub-routes) is NOT a
// staff route: it has its own session (cookie PORTAL_SESSION_COOKIE,
// never Auth.js), enforced by every portal page and /api/portal route.
const isPortalPath = (pathname: string) => /^\/(en|es)\/portal(\/.*)?$/.test(pathname);
const isPortalAccessPath = (pathname: string) => /^\/(en|es)\/portal\/access\/?$/.test(pathname);

const isPublicPath = (pathname: string) =>
  /^\/(en|es)\/login(\/.*)?$/.test(pathname) ||
  /^(\/(en|es))?\/book\/?$/.test(pathname) ||
  // The public Privacy Notice — exact match, no sub-paths (Step 2B).
  /^(\/(en|es))?\/privacy\/?$/.test(pathname) ||
  isPortalPath(pathname);

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

  // Defense in depth for the portal: without a portal cookie at all,
  // only the access page is reachable. (Pages still validate the session
  // itself — a cookie being present proves nothing.)
  if (
    isPortalPath(pathname) &&
    !isPortalAccessPath(pathname) &&
    !req.cookies.has(PORTAL_SESSION_COOKIE)
  ) {
    const locale = pathname.startsWith("/es") ? "es" : "en";
    return NextResponse.redirect(new URL(`/${locale}/portal/access`, req.nextUrl.origin));
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
  // The 149e9513-… prefix is Vercel BotID's own challenge/proxy path
  // (added as a rewrite by withBotId in next.config.ts) — it must reach
  // that rewrite without a login redirect, or the bot check can't run
  // for anonymous visitors on /book.
  matcher: [
    "/((?!api|trpc|_next|_vercel|149e9513-01fa-4fb0-aad4-566afd725d1b|.*\\..*).*)",
  ],
};
