import { logAuditEvent } from "@/lib/audit";
import { PartnerLimitError, PartnerValidationError, createPartnerReferral } from "@/lib/partners/queries";
import { partnerDb, requirePartnerSessionForApi } from "@/lib/partners/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";
import { requestIp, requestUserAgent } from "@/lib/request-info";

// The alliance sends AMS a referral. Requires its "I have this person's
// permission" checkbox (stored with date/IP). Becomes a Lead in Clients
// marked "Added by [ally]", a referral and a task for staff.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;

  const body = (await readSmallJson(request, 8192)) as { referral?: unknown; permissionText?: unknown } | null;
  if (!body || !body.referral || typeof body.permissionText !== "string") return badRequest();

  try {
    const referral = await createPartnerReferral(partnerDb(), {
      allianceId: session.allianceId,
      input: body.referral,
      permissionText: body.permissionText.slice(0, 500),
      ipAddress: requestIp(request.headers),
      userAgent: requestUserAgent(request.headers),
    });
    await logAuditEvent({
      action: "partner.referral_sent",
      entityType: "referral",
      entityId: referral.id,
      summary: `Alliance sent referral R-${String(referral.referralSeq).padStart(3, "0")} through the partner portal`,
      actor: `partner-portal:${session.allianceId}`,
    });
    return json({ ok: true });
  } catch (err) {
    if (err instanceof PartnerValidationError) return json({ error: err.code }, 400);
    if (err instanceof PartnerLimitError) return json({ error: "limit_reached" }, 429);
    throw err;
  }
}
