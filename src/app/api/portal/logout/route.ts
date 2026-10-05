import { cookies } from "next/headers";
import { isDatabaseConfigured } from "@/lib/db/config";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal/config";
import { endPortalSession } from "@/lib/portal/access";
import { clearPortalSessionCookie, portalDb } from "@/lib/portal/session";
import { forbiddenOrigin, isSameOrigin, json } from "@/lib/portal/http";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const token = (await cookies()).get(PORTAL_SESSION_COOKIE)?.value;
  if (token && isDatabaseConfigured()) await endPortalSession(portalDb(), token);
  const response = json({ ok: true });
  clearPortalSessionCookie(response);
  return response;
}
