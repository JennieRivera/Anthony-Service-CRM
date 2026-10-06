import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isBlobConfigured } from "@/lib/blob/config";
import { PARTNER_MAX_UPLOAD_BYTES } from "@/lib/partners/config";
import { PORTAL_ALLOWED_UPLOAD_CONTENT_TYPES } from "@/lib/portal/fileTypes";
import { partnerUploadKindFor } from "@/lib/partners/tokens";
import { requirePartnerSessionForApi } from "@/lib/partners/session";
import { forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";

// Step 2: a short-lived Vercel Blob client token, only for a pathname that
// /start signed for this same alliance. The browser uploads straight to
// private Blob storage (up to 10 MB).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;
  if (!isBlobConfigured()) return json({ error: "unavailable" }, 503);

  const body = (await readSmallJson(request, 8192)) as HandleUploadBody | null;
  if (!body || body.type !== "blob.generate-client-token") return json({ error: "invalid" }, 400);

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!partnerUploadKindFor(pathname, session.allianceId)) {
          throw new Error("pathname not issued for this session");
        }
        return {
          allowedContentTypes: PORTAL_ALLOWED_UPLOAD_CONTENT_TYPES,
          maximumSizeInBytes: PARTNER_MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          allowOverwrite: false,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });
    return json(result);
  } catch {
    return json({ error: "invalid" }, 400);
  }
}
