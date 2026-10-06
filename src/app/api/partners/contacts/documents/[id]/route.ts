import { getPartnerContactDocumentUrl } from "@/lib/partners/network";
import { streamPrivateFile } from "@/lib/partners/files";
import { partnerDb, requirePartnerSessionForApi } from "@/lib/partners/session";
import { notFound } from "@/lib/portal/http";

// A document the signed-in ally uploaded for one of ITS contacts.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;
  const { id } = await params;
  const doc = await getPartnerContactDocumentUrl(partnerDb(), session.allianceId, id);
  if (!doc) return notFound();
  return streamPrivateFile(request, doc.url, doc.fileName);
}
