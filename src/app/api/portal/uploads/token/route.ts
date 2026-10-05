import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isBlobConfigured } from "@/lib/blob/config";
import { PORTAL_MAX_UPLOAD_BYTES } from "@/lib/portal/config";
import { PORTAL_ALLOWED_UPLOAD_CONTENT_TYPES } from "@/lib/portal/fileTypes";
import { isUploadPathnameForClient } from "@/lib/portal/tokens";
import { requirePortalSessionForApi } from "@/lib/portal/session";
import { forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";

// Step 2 of a portal upload: a short-lived Vercel Blob client token, only
// for a pathname that /start signed for this same client. The browser
// then uploads straight to private Blob storage (which is what allows
// files up to 10 MB — a Vercel Function body is capped at 4.5 MB).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePortalSessionForApi();
  if (response) return response;
  if (!isBlobConfigured()) return json({ error: "unavailable" }, 503);

  const body = (await readSmallJson(request, 8192)) as HandleUploadBody | null;
  if (!body || body.type !== "blob.generate-client-token") return json({ error: "invalid" }, 400);

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!isUploadPathnameForClient(pathname, session.clientId)) {
          throw new Error("pathname not issued for this session");
        }
        return {
          allowedContentTypes: PORTAL_ALLOWED_UPLOAD_CONTENT_TYPES,
          maximumSizeInBytes: PORTAL_MAX_UPLOAD_BYTES,
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
