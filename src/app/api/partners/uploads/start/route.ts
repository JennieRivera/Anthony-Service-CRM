import { isBlobConfigured } from "@/lib/blob/config";
import { PORTAL_FILE_CONTENT_TYPES, portalKindForFileName } from "@/lib/portal/fileTypes";
import { PARTNER_MAX_PHOTOS } from "@/lib/partners/config";
import { PARTNER_UPLOAD_KINDS, createPartnerUploadPathname, type PartnerUploadKind } from "@/lib/partners/tokens";
import { countPartnerPhotos, isPartnerUploadLimitReached } from "@/lib/partners/queries";
import { partnerDb, requirePartnerSessionForApi } from "@/lib/partners/session";
import { isOwnPartnerContact } from "@/lib/partners/network";
import { badRequest, forbiddenOrigin, isSameOrigin, json, readSmallJson } from "@/lib/portal/http";

// Logo and gallery photos must be web images (shown in the CRM).
const IMAGE_ONLY_KINDS: PartnerUploadKind[] = ["logo", "photo"];

// Step 1 of a partner upload: checks the file type by extension (the real
// bytes are checked in /complete) and the limits, then signs a blob
// pathname bound to THIS alliance and this kind of upload.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;
  if (!isBlobConfigured()) return json({ error: "unavailable" }, 503);

  const body = (await readSmallJson(request)) as { fileName?: unknown; kind?: unknown; contactId?: unknown; folder?: unknown } | null;
  if (!body || typeof body.fileName !== "string" || body.fileName.length > 255) return badRequest();
  if (!(PARTNER_UPLOAD_KINDS as readonly unknown[]).includes(body.kind)) return badRequest();
  const kind = body.kind as PartnerUploadKind;

  const fileKind = portalKindForFileName(body.fileName);
  if (!fileKind) return json({ error: "unsupported_type" }, 400);
  if ((IMAGE_ONLY_KINDS.includes(kind) || (kind === "document" && body.folder === "photos")) && !["jpeg", "png", "webp"].includes(fileKind)) {
    return json({ error: "unsupported_type" }, 400);
  }

  const db = partnerDb();
  if (await isPartnerUploadLimitReached(db, session.allianceId)) return json({ error: "limit_reached" }, 429);
  // A contact document must be for one of this ally's OWN contacts.
  if (kind === "contact_document" && !(await isOwnPartnerContact(db, session.allianceId, body.contactId))) return badRequest();
  if (kind === "photo" && (await countPartnerPhotos(db, session.allianceId)) >= PARTNER_MAX_PHOTOS) {
    return json({ error: "photo_limit" }, 429);
  }

  return json({
    pathname: createPartnerUploadPathname(session.allianceId, kind, body.fileName),
    contentType: PORTAL_FILE_CONTENT_TYPES[fileKind],
  });
}
