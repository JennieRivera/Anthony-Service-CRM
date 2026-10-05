import { logAuditEvent } from "@/lib/audit";
import { PortalNotFoundError, requestAppointmentChange } from "@/lib/portal/queries";
import { portalDb, requirePortalSessionForApi } from "@/lib/portal/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, notFound, readSmallJson } from "@/lib/portal/http";

// "Ask to cancel / reschedule": never changes the appointment, only
// creates a task for staff to confirm with the client.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePortalSessionForApi();
  if (response) return response;

  const body = (await readSmallJson(request)) as { kind?: unknown; message?: unknown } | null;
  if (!body || (body.kind !== "cancel" && body.kind !== "reschedule")) return badRequest();
  const message = typeof body.message === "string" ? body.message.replace(/[\u0000-\u001f\u007f]/g, " ").trim() : "";
  if (message.length > 500) return badRequest();

  const { id } = await params;
  try {
    const result = await requestAppointmentChange(portalDb(), {
      clientId: session.clientId,
      appointmentId: id,
      kind: body.kind,
      message,
    });
    if (result === "created") {
      await logAuditEvent({
        action: `portal.appointment_${body.kind}_requested`,
        entityType: "appointment",
        entityId: id,
        summary: `Client asked to ${body.kind} an appointment through the portal`,
        actor: `client-portal:${session.clientId}`,
      });
    }
    return json({ ok: true, result });
  } catch (err) {
    if (err instanceof PortalNotFoundError) return notFound();
    throw err;
  }
}
