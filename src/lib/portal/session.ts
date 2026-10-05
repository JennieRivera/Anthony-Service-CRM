import { cache } from "react";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/db/config";
import { PORTAL_SESSION_COOKIE } from "./config";
import { resolvePortalSession, type ResolvedPortalSession } from "./access";
import type { PortalDb } from "./db";

// Next.js glue for the client-portal session. The portal session is its
// own httpOnly cookie, completely separate from Auth.js (staff): nothing
// here ever calls auth(), and nothing staff-side ever reads this cookie.

export function portalDb(): PortalDb {
  return getDb() as unknown as PortalDb;
}

// Once per request (React cache): which client, if any, is signed in.
export const getPortalSession = cache(async (): Promise<ResolvedPortalSession | null> => {
  if (!isDatabaseConfigured()) return null;
  const token = (await cookies()).get(PORTAL_SESSION_COOKIE)?.value;
  if (!token) return null;
  return resolvePortalSession(portalDb(), token);
});

// For /api/portal/* route handlers: the session, or a 401 response.
export async function requirePortalSessionForApi(): Promise<
  { session: ResolvedPortalSession; response?: never } | { session?: never; response: NextResponse }
> {
  const session = await getPortalSession();
  if (!session) {
    return { response: NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore }) };
  }
  return { session };
}

export const noStore = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

export function setPortalSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(PORTAL_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearPortalSessionCookie(response: NextResponse) {
  response.cookies.set(PORTAL_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
