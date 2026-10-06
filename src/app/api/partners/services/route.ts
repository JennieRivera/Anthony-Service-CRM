import { logAuditEvent } from "@/lib/audit";
import { PartnerLimitError, PartnerValidationError } from "@/lib/partners/queries";
import { savePartnerService } from "@/lib/partners/services";
import { partnerDb, requirePartnerSessionForApi } from "@/lib/partners/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";

// "My services": add a service. Staff gets a review task.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;
  const body = (await readSmallJson(request, 8192)) as { values?: unknown } | null;
  if (!body?.values) return badRequest();
  try {
    const service = await savePartnerService(partnerDb(), { allianceId: session.allianceId, values: body.values });
    await logAuditEvent({
      action: "partner.service_added",
      entityType: "alliance",
      entityId: session.allianceId,
      summary: `Alliance added a service in the partner portal: ${service.name}`,
      actor: `partner-portal:${session.allianceId}`,
    });
    return json({ ok: true, service });
  } catch (err) {
    if (err instanceof PartnerValidationError) return json({ error: err.code }, 400);
    if (err instanceof PartnerLimitError) return json({ error: "limit_reached" }, 429);
    throw err;
  }
}
