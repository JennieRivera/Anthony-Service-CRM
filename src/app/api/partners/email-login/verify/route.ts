import { isDatabaseConfigured } from "@/lib/db/config";
import { logAuditEvent } from "@/lib/audit";
import { verifyEmailLogin } from "@/lib/partners/conecta";
import { partnerIpKey } from "@/lib/partners/tokens";
import { partnerDb, setPartnerSessionCookie } from "@/lib/partners/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";
import { requestIp } from "@/lib/request-info";

// "Sign in with my email", step 2: the right code → a partner session
// cookie (never the client portal's). A session lifecycle route.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  if (!isDatabaseConfigured()) return json({ error: "unavailable" }, 503);
  const body = (await readSmallJson(request)) as { email?: unknown; code?: unknown } | null;
  if (!body) return badRequest();

  const ip = requestIp(request.headers);
  const result = await verifyEmailLogin(partnerDb(), { email: body.email, code: body.code, ipKey: ip ? partnerIpKey(ip) : null });
  if (!result.ok) return json({ error: result.reason }, result.reason === "rate_limited" ? 429 : 400);

  await logAuditEvent({
    action: "partner.email_login",
    entityType: "alliance",
    entityId: result.allianceId,
    summary: "Alliance signed in to Diamante Conecta 360 with an email code",
    actor: `partner-portal:${result.allianceId}`,
  });
  const response = json({ ok: true });
  setPartnerSessionCookie(response, result.sessionToken, result.sessionExpiresAt);
  return response;
}
