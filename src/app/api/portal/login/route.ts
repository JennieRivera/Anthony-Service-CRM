import { isDatabaseConfigured } from "@/lib/db/config";
import { logAuditEvent } from "@/lib/audit";
import { redeemPortalAccessLink } from "@/lib/portal/access";
import { portalIpKey } from "@/lib/portal/tokens";
import { portalDb, setPortalSessionCookie } from "@/lib/portal/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";
import { requestIp } from "@/lib/request-info";

// Client portal sign-in: personal link token + last 4 digits of the
// client's phone → a portal session cookie. The token arrives in the POST
// body (the link carries it after "#", so it never reaches server logs).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  if (!isDatabaseConfigured()) return json({ error: "unavailable" }, 503);

  const body = (await readSmallJson(request)) as { token?: unknown; lastFour?: unknown } | null;
  if (!body) return badRequest();

  const ip = requestIp(request.headers);
  const result = await redeemPortalAccessLink(portalDb(), {
    token: body.token,
    lastFour: body.lastFour,
    ipKey: ip ? portalIpKey(ip) : null,
  });

  if (!result.ok) {
    if (result.reason === "locked") {
      await logAuditEvent({
        action: "portal.link_locked",
        entityType: "portal_access_link",
        summary: "Portal link locked after too many wrong phone-digit attempts",
        actor: "client-portal:unknown",
      });
    }
    const status = result.reason === "rate_limited" ? 429 : 400;
    return json({ error: result.reason }, status);
  }

  await logAuditEvent({
    action: "portal.link_used",
    entityType: "client",
    entityId: result.clientId,
    summary: "Client signed in to the portal with a personal link",
    actor: `client-portal:${result.clientId}`,
  });

  const response = json({ ok: true });
  setPortalSessionCookie(response, result.sessionToken, result.sessionExpiresAt);
  return response;
}
