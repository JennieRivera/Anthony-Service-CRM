import { logAuditEvent } from "@/lib/audit";
import { getLegalTexts, pickLocale } from "@/lib/legal/texts";
import { recordPartnerConsent } from "@/lib/partners/queries";
import { partnerDb, requirePartnerSessionForApi } from "@/lib/partners/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";
import { requestIp, requestUserAgent } from "@/lib/request-info";

// First sign-in: the alliance accepts the alliance terms AND the "not a law
// firm" notice. Stored as append-only evidence (date/time, IP, browser,
// exact text shown).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;

  const body = (await readSmallJson(request)) as { acceptedTerms?: unknown; acceptedNotice?: unknown; locale?: unknown } | null;
  if (!body || body.acceptedTerms !== true || body.acceptedNotice !== true) return badRequest();
  const locale = body.locale === "es" ? "es" : "en";

  const db = partnerDb();
  const texts = await getLegalTexts(db);
  const evidence = { ipAddress: requestIp(request.headers), userAgent: requestUserAgent(request.headers) };
  await recordPartnerConsent(db, { allianceId: session.allianceId, type: "partner_terms", textShown: pickLocale(texts.partner_terms, locale), ...evidence });
  await recordPartnerConsent(db, { allianceId: session.allianceId, type: "not_a_law_firm", textShown: pickLocale(texts.not_a_law_firm_ack, locale), ...evidence });
  await logAuditEvent({
    action: "partner.terms_accepted",
    entityType: "alliance",
    entityId: session.allianceId,
    summary: "Alliance accepted the alliance terms and the not-a-law-firm notice (partner portal)",
    actor: `partner-portal:${session.allianceId}`,
  });
  return json({ ok: true });
}
