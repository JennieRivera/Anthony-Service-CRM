import { logAuditEvent } from "@/lib/audit";
import { ArchiveMoveError, moveAllianceDocument } from "@/lib/partners/archive";
import { partnerDb, requirePartnerSessionForApi } from "@/lib/partners/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, notFound, readSmallJson } from "@/lib/portal/http";

// "My files" → "Move to…": the ally moves one of ITS OWN uploads between
// Documents and Photos & images (web images only in Photos).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;
  const { id } = await params;
  const body = (await readSmallJson(request)) as { folder?: unknown } | null;
  if (!body) return badRequest();
  try {
    const moved = await moveAllianceDocument(partnerDb(), { allianceId: session.allianceId, documentId: id, folder: body.folder, by: "partner" });
    await logAuditEvent({
      action: "partner.document_moved",
      entityType: "alliance",
      entityId: session.allianceId,
      summary: `Alliance moved "${moved.fileName}" to ${moved.folder}`,
      actor: `partner-portal:${session.allianceId}`,
    });
  } catch (err) {
    if (err instanceof ArchiveMoveError) return err.message === "not_found" ? notFound() : json({ error: err.message }, 400);
    throw err;
  }
  return json({ ok: true });
}
