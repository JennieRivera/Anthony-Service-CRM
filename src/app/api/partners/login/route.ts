import { isDatabaseConfigured } from "@/lib/db/config";
import { logAuditEvent } from "@/lib/audit";
import { redeemPartnerAccessLink } from "@/lib/partners/access";
import { partnerIpKey } from "@/lib/partners/tokens";
import { partnerDb, setPartnerSessionCookie } from "@/lib/partners/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";
import { requestIp } from "@/lib/request-info";

// Partner portal sign-in: personal link token + last 4 digits of the
// alliance's phone → a partner session cookie (never the client portal's).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  if (!isDatabaseConfigured()) return json({ error: "unavailable" }, 503);

  const body = (await readSmallJson(request)) as { token?: unknown; lastFour?: unknown } | null;
  if (!body) return badRequest();

  const ip = requestIp(request.headers);
  const result = await redeemPartnerAccessLink(partnerDb(), {
    token: body.token,
    lastFour: body.lastFour,
    ipKey: ip ? partnerIpKey(ip) : null,
  });

  if (!result.ok) {
    if (result.reason === "locked") {
      await logAuditEvent({
        action: "partner.link_locked",
        entityType: "partner_access_link",
        summary: "Partner portal link locked after too many wrong phone-digit attempts",
        actor: "partner-portal:unknown",
      });
    }
    return json({ error: result.reason }, result.reason === "rate_limited" ? 429 : 400);
  }

  await logAuditEvent({
    action: "partner.link_used",
    entityType: "alliance",
    entityId: result.allianceId,
    summary: "Alliance signed in to the partner portal with a personal link",
    actor: `partner-portal:${result.allianceId}`,
  });
  const response = json({ ok: true });
  setPartnerSessionCookie(response, result.sessionToken, result.sessionExpiresAt);
  return response;
}
