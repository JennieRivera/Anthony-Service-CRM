import { getDirectoryLogoUrl } from "@/lib/partners/directory";
import { streamPrivateFile } from "@/lib/partners/files";
import { partnerDb, requirePartnerSessionForApi } from "@/lib/partners/session";
import { notFound } from "@/lib/portal/http";

// The logo of an ally in the network directory — only for an ally allowed
// to see the directory, and only for allies that are listed in it.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;
  const { id } = await params;
  const url = await getDirectoryLogoUrl(partnerDb(), session.allianceId, id);
  if (!url) return notFound();
  return streamPrivateFile(request, url, url.split("/").pop() ?? "logo");
}
