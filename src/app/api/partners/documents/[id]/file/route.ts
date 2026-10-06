import { getPartnerDocumentFile } from "@/lib/partners/queries";
import { streamPrivateFile } from "@/lib/partners/files";
import { partnerDb, requirePartnerSessionForApi } from "@/lib/partners/session";
import { notFound } from "@/lib/portal/http";

// One of the signed-in alliance's own documents (its uploads, or one staff
// marked "Visible to the partner"). Anything else is a plain 404.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;
  const { id } = await params;
  const doc = await getPartnerDocumentFile(partnerDb(), session.allianceId, id);
  if (!doc) return notFound();
  return streamPrivateFile(request, doc.blobUrl, doc.fileName);
}
