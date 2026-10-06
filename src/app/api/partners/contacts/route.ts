import { logAuditEvent } from "@/lib/audit";
import { createPartnerContact } from "@/lib/partners/network";
import { PartnerLimitError, PartnerValidationError } from "@/lib/partners/queries";
import { partnerDb, requirePartnerSessionForApi } from "@/lib/partners/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";
import { requestIp, requestUserAgent } from "@/lib/request-info";

// "My allies and contacts": the ally adds a person (→ Lead + referral to
// AMS) or a business (→ Prospect alliance "Added by [ally]"). Requires the
// "I have this person's permission" checkbox (stored with date and IP).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;

  const body = (await readSmallJson(request, 8192)) as { contact?: unknown; referral?: unknown; permissionText?: unknown } | null;
  const input = body?.contact ?? body?.referral;
  if (!body || !input || typeof body.permissionText !== "string") return badRequest();

  try {
    const contact = await createPartnerContact(partnerDb(), {
      allianceId: session.allianceId,
      input,
      permissionText: body.permissionText.slice(0, 500),
      ipAddress: requestIp(request.headers),
      userAgent: requestUserAgent(request.headers),
    });
    await logAuditEvent({
      action: "partner.contact_added",
      entityType: "alliance",
      entityId: session.allianceId,
      summary: `Alliance added a ${contact.kind} to its network in the partner portal`,
      actor: `partner-portal:${session.allianceId}`,
    });
    return json({ ok: true });
  } catch (err) {
    if (err instanceof PartnerValidationError) return json({ error: err.code }, 400);
    if (err instanceof PartnerLimitError) return json({ error: "limit_reached" }, 429);
    throw err;
  }
}
