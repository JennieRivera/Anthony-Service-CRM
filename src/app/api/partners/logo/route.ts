import { getPartnerLogoUrl } from "@/lib/partners/queries";
import { streamPrivateFile } from "@/lib/partners/files";
import { partnerDb, requirePartnerSessionForApi } from "@/lib/partners/session";
import { notFound } from "@/lib/portal/http";

// The signed-in alliance's own logo.
export async function GET(request: Request) {
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;
  const url = await getPartnerLogoUrl(partnerDb(), session.allianceId);
  if (!url) return notFound();
  return streamPrivateFile(request, url, url.split("/").pop() ?? "logo.png");
}
