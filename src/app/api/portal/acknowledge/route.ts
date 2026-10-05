import { logAuditEvent } from "@/lib/audit";
import { getLegalTexts, pickLocale, recordConsentEvent } from "@/lib/legal/texts";
import { portalDb, requirePortalSessionForApi } from "@/lib/portal/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";
import { requestIp, requestUserAgent } from "@/lib/request-info";

// The mandatory "I understand Anthony Multiservice is not a law firm"
// acknowledgment, required before a client first uses the portal. Stored
// as append-only evidence (date/time, IP, browser, exact text shown).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePortalSessionForApi();
  if (response) return response;

  const body = (await readSmallJson(request)) as { accepted?: unknown; locale?: unknown } | null;
  if (!body || body.accepted !== true) return badRequest();
  const locale = body.locale === "es" ? "es" : "en";

  const db = portalDb();
  const texts = await getLegalTexts(db);
  await recordConsentEvent(db, {
    clientId: session.clientId,
    consentType: "not_a_law_firm",
    granted: true,
    source: "portal",
    textShown: pickLocale(texts.not_a_law_firm_ack, locale),
    ipAddress: requestIp(request.headers),
    userAgent: requestUserAgent(request.headers),
  });
  await logAuditEvent({
    action: "portal.not_a_law_firm_acknowledged",
    entityType: "client",
    entityId: session.clientId,
    summary: "Client acknowledged that Anthony Multiservice is not a law firm (portal)",
    actor: `client-portal:${session.clientId}`,
  });
  return json({ ok: true });
}
