import { logAuditEvent } from "@/lib/audit";
import { PartnerLimitError, PartnerValidationError } from "@/lib/partners/queries";
import { removePartnerService, savePartnerService } from "@/lib/partners/services";
import { partnerDb, requirePartnerSessionForApi } from "@/lib/partners/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, notFound, readSmallJson } from "@/lib/portal/http";

// "My services": edit or remove one of the signed-in alliance's own
// services. Staff gets a review task for each change.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;
  const { id } = await params;
  const body = (await readSmallJson(request, 8192)) as { values?: unknown } | null;
  if (!body?.values) return badRequest();
  try {
    const service = await savePartnerService(partnerDb(), { allianceId: session.allianceId, id, values: body.values });
    await logAuditEvent({
      action: "partner.service_changed",
      entityType: "alliance",
      entityId: session.allianceId,
      summary: `Alliance edited a service in the partner portal: ${service.name}`,
      actor: `partner-portal:${session.allianceId}`,
    });
    return json({ ok: true, service });
  } catch (err) {
    if (err instanceof PartnerValidationError) return err.code === "not_found" ? notFound() : json({ error: err.code }, 400);
    if (err instanceof PartnerLimitError) return json({ error: "limit_reached" }, 429);
    throw err;
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;
  const { id } = await params;
  try {
    if (!(await removePartnerService(partnerDb(), { allianceId: session.allianceId, id }))) return notFound();
  } catch (err) {
    if (err instanceof PartnerLimitError) return json({ error: "limit_reached" }, 429);
    throw err;
  }
  await logAuditEvent({
    action: "partner.service_removed",
    entityType: "alliance",
    entityId: session.allianceId,
    summary: "Alliance removed a service in the partner portal",
    actor: `partner-portal:${session.allianceId}`,
  });
  return json({ ok: true });
}
