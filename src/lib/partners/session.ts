import { cache } from "react";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/db/config";
import type { PortalDb } from "@/lib/portal/db";
import { noStore } from "@/lib/portal/session";
import { PARTNER_SESSION_COOKIE } from "./config";
import { resolvePartnerSession, type ResolvedPartnerSession } from "./access";

// Next.js glue for the partner-portal session: its own httpOnly cookie,
// separate from the client portal and from Auth.js (staff).

export function partnerDb(): PortalDb {
  return getDb() as unknown as PortalDb;
}

export const getPartnerSession = cache(async (): Promise<ResolvedPartnerSession | null> => {
  if (!isDatabaseConfigured()) return null;
  const token = (await cookies()).get(PARTNER_SESSION_COOKIE)?.value;
  if (!token) return null;
  return resolvePartnerSession(partnerDb(), token);
});

export async function requirePartnerSessionForApi(): Promise<
  { session: ResolvedPartnerSession; response?: never } | { session?: never; response: NextResponse }
> {
  const session = await getPartnerSession();
  if (!session) {
    return { response: NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore }) };
  }
  return { session };
}

export function setPartnerSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(PARTNER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearPartnerSessionCookie(response: NextResponse) {
  response.cookies.set(PARTNER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
