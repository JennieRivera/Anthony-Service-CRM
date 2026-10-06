import { cookies } from "next/headers";
import { isDatabaseConfigured } from "@/lib/db/config";
import { PARTNER_SESSION_COOKIE } from "@/lib/partners/config";
import { endPartnerSession } from "@/lib/partners/access";
import { clearPartnerSessionCookie, partnerDb } from "@/lib/partners/session";
import { forbiddenOrigin, isSameOrigin, json } from "@/lib/portal/http";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const token = (await cookies()).get(PARTNER_SESSION_COOKIE)?.value;
  if (token && isDatabaseConfigured()) await endPartnerSession(partnerDb(), token);
  const response = json({ ok: true });
  clearPartnerSessionCookie(response);
  return response;
}
