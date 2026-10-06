import { logAuditEvent } from "@/lib/audit";
import { getDirectoryStatus, setDirectoryOptIn } from "@/lib/partners/directory";
import { partnerDb, requirePartnerSessionForApi } from "@/lib/partners/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";
import { requestIp, requestUserAgent } from "@/lib/request-info";

// The ally accepts (or withdraws) showing its business in the network
// directory. Only offered once AMS has marked it for the directory.
export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;
  const body = (await readSmallJson(request)) as { optIn?: unknown; textShown?: unknown } | null;
  if (!body || typeof body.optIn !== "boolean" || typeof body.textShown !== "string") return badRequest();
  const db = partnerDb();
  if (!(await getDirectoryStatus(db, session.allianceId)).listed) return badRequest();
  await setDirectoryOptIn(db, {
    allianceId: session.allianceId,
    optIn: body.optIn,
    textShown: body.textShown.slice(0, 1000),
    ipAddress: requestIp(request.headers),
    userAgent: requestUserAgent(request.headers),
  });
  await logAuditEvent({
    action: body.optIn ? "partner.directory_opt_in" : "partner.directory_opt_out",
    entityType: "alliance",
    entityId: session.allianceId,
    summary: body.optIn ? "Alliance accepted appearing in the network directory" : "Alliance withdrew from the network directory",
    actor: `partner-portal:${session.allianceId}`,
  });
  return json({ ok: true });
}
