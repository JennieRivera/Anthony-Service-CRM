import { logAuditEvent } from "@/lib/audit";
import { PortalLimitError, PortalValidationError, updatePortalProfile } from "@/lib/portal/account";
import { portalDb, requirePortalSessionForApi } from "@/lib/portal/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";

// My profile: the client updates their own phone, email, address,
// language and best time to call (never their name). Saved directly, with
// an audit entry and a "Review client info change" task for staff.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePortalSessionForApi();
  if (response) return response;

  const body = await readSmallJson(request);
  if (!body) return badRequest();

  try {
    const { changed } = await updatePortalProfile(portalDb(), { clientId: session.clientId, values: body });
    if (changed.length > 0) {
      await logAuditEvent({
        action: "portal.profile_updated",
        entityType: "client",
        entityId: session.clientId,
        summary: `Client updated their contact details through the portal: ${changed.join(", ")}`,
        actor: `client-portal:${session.clientId}`,
      });
    }
    return json({ ok: true, changed });
  } catch (err) {
    if (err instanceof PortalValidationError) return json({ error: err.code }, 400);
    if (err instanceof PortalLimitError) return json({ error: "limit_reached" }, 429);
    throw err;
  }
}
