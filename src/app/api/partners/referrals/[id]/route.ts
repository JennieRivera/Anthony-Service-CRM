import { logAuditEvent } from "@/lib/audit";
import { PartnerNotFoundError, PartnerValidationError, setPartnerReferralStage } from "@/lib/partners/queries";
import { partnerDb, requirePartnerSessionForApi } from "@/lib/partners/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, notFound, readSmallJson } from "@/lib/portal/http";

// The alliance updates the status of a referral AMS sent to it:
// contacted / closed / not closed.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;
  const body = (await readSmallJson(request)) as { stage?: unknown } | null;
  if (!body) return badRequest();
  const { id } = await params;
  try {
    const row = await setPartnerReferralStage(partnerDb(), { allianceId: session.allianceId, referralId: id, stage: body.stage });
    await logAuditEvent({
      action: "partner.referral_status_changed",
      entityType: "referral",
      entityId: row.id,
      summary: `Alliance marked referral R-${String(row.referralSeq).padStart(3, "0")} as ${String(body.stage)}`,
      actor: `partner-portal:${session.allianceId}`,
    });
    return json({ ok: true });
  } catch (err) {
    if (err instanceof PartnerNotFoundError) return notFound();
    if (err instanceof PartnerValidationError) return json({ error: err.code }, 400);
    throw err;
  }
}
