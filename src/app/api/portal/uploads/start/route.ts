import { isBlobConfigured } from "@/lib/blob/config";
import { createUploadPathname } from "@/lib/portal/tokens";
import { PORTAL_FILE_CONTENT_TYPES, portalKindForFileName } from "@/lib/portal/fileTypes";
import { getPortalCase, isClientUploadLimitReached } from "@/lib/portal/queries";
import { portalDb, requirePortalSessionForApi } from "@/lib/portal/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, notFound, readSmallJson } from "@/lib/portal/http";

// Step 1 of a portal upload: checks the file type (by extension here; the
// real bytes are checked in /complete), the daily limit and the target
// case, then hands back a signed blob pathname bound to THIS client.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePortalSessionForApi();
  if (response) return response;
  if (!isBlobConfigured()) return json({ error: "unavailable" }, 503);

  const body = (await readSmallJson(request)) as { fileName?: unknown; caseId?: unknown } | null;
  if (!body || typeof body.fileName !== "string" || body.fileName.length > 255) return badRequest();

  const kind = portalKindForFileName(body.fileName);
  if (!kind) return json({ error: "unsupported_type" }, 400);

  const db = portalDb();
  if (body.caseId != null && !(await getPortalCase(db, session.clientId, body.caseId))) return notFound();
  if (await isClientUploadLimitReached(db, session.clientId)) return json({ error: "limit_reached" }, 429);

  return json({
    pathname: createUploadPathname(session.clientId, body.fileName),
    contentType: PORTAL_FILE_CONTENT_TYPES[kind],
  });
}
