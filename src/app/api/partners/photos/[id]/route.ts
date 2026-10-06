import { del } from "@vercel/blob";
import { logAuditEvent } from "@/lib/audit";
import { getPartnerPhotoUrl, removePartnerPhoto } from "@/lib/partners/queries";
import { streamPrivateFile } from "@/lib/partners/files";
import { partnerDb, requirePartnerSessionForApi } from "@/lib/partners/session";
import { forbiddenOrigin, isSameOrigin, json, notFound } from "@/lib/portal/http";

// One of the signed-in alliance's own gallery photos (view / remove).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;
  const { id } = await params;
  const url = await getPartnerPhotoUrl(partnerDb(), session.allianceId, id);
  if (!url) return notFound();
  return streamPrivateFile(request, url, url.split("/").pop() ?? "photo.jpg");
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;
  const { id } = await params;
  const url = await removePartnerPhoto(partnerDb(), session.allianceId, id);
  if (!url) return notFound();
  await del(url).catch(() => undefined);
  await logAuditEvent({
    action: "partner.photo_removed",
    entityType: "alliance",
    entityId: session.allianceId,
    summary: "Alliance removed a gallery photo",
    actor: `partner-portal:${session.allianceId}`,
  });
  return json({ ok: true });
}
