import { logAuditEvent } from "@/lib/audit";
import { PortalLimitError, PortalValidationError, requestPortalServices } from "@/lib/portal/account";
import { portalDb, requirePortalSessionForApi } from "@/lib/portal/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";

// Services that interest me: adds the services to the client's
// "Interested Services" (no duplicates) and creates a task for staff to
// call them. Never creates a case or an invoice.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePortalSessionForApi();
  if (response) return response;

  const body = (await readSmallJson(request)) as { services?: unknown; comment?: unknown } | null;
  if (!body) return badRequest();

  try {
    const { added } = await requestPortalServices(portalDb(), {
      clientId: session.clientId,
      services: body.services,
      comment: body.comment ?? "",
    });
    await logAuditEvent({
      action: "portal.services_requested",
      entityType: "client",
      entityId: session.clientId,
      summary: `Client asked about services through the portal${added.length ? ` (added: ${added.join(", ")})` : ""}`,
      actor: `client-portal:${session.clientId}`,
    });
    return json({ ok: true });
  } catch (err) {
    if (err instanceof PortalValidationError) return json({ error: err.code }, 400);
    if (err instanceof PortalLimitError) return json({ error: "limit_reached" }, 429);
    throw err;
  }
}
