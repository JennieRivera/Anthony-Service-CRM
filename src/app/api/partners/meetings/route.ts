import { logAuditEvent } from "@/lib/audit";
import { requestPartnerMeeting } from "@/lib/partners/calendar";
import { PartnerLimitError, PartnerValidationError } from "@/lib/partners/queries";
import { partnerDb, requirePartnerSessionForApi } from "@/lib/partners/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";

// "Request a meeting": creates a task for AMS to confirm.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;
  const body = (await readSmallJson(request, 8192)) as { meeting?: unknown } | null;
  if (!body?.meeting) return badRequest();
  try {
    await requestPartnerMeeting(partnerDb(), { allianceId: session.allianceId, input: body.meeting });
  } catch (err) {
    if (err instanceof PartnerValidationError) return json({ error: err.code }, 400);
    if (err instanceof PartnerLimitError) return json({ error: "limit_reached" }, 429);
    throw err;
  }
  await logAuditEvent({
    action: "partner.meeting_requested",
    entityType: "alliance",
    entityId: session.allianceId,
    summary: "Alliance requested a meeting in the partner portal",
    actor: `partner-portal:${session.allianceId}`,
  });
  return json({ ok: true });
}
