import { getPartnerMarketingFile } from "@/lib/partners/queries";
import { streamPrivateFile } from "@/lib/partners/files";
import { partnerDb, requirePartnerSessionForApi } from "@/lib/partners/session";
import { notFound } from "@/lib/portal/http";

// Marketing material shared with this alliance (all partners or chosen
// ones), or material it submitted itself. Anything else is a 404.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;
  const { id } = await params;
  const asset = await getPartnerMarketingFile(partnerDb(), session.allianceId, id);
  if (!asset) return notFound();
  return streamPrivateFile(request, asset.blobUrl, asset.fileName);
}
