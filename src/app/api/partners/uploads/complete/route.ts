import { del, get, head } from "@vercel/blob";
import { or, eq } from "drizzle-orm";
import { allianceDocuments, marketingContentAssets, partnerContactDocuments, partnerPhotos, partnerProfiles } from "@/lib/db/schema";
import { isBlobConfigured } from "@/lib/blob/config";
import { logAuditEvent } from "@/lib/audit";
import { scanFileForSensitiveData } from "@/lib/documents/fileValidation";
import { PARTNER_MAX_UPLOAD_BYTES } from "@/lib/partners/config";
import { portalKindForFileName, validatePortalFile } from "@/lib/portal/fileTypes";
import { partnerUploadKindFor } from "@/lib/partners/tokens";
import {
  PARTNER_DOCUMENT_TYPES,
  PartnerLimitError,
  PartnerNotFoundError,
  addPartnerPhoto,
  getPartnerLogoUrl,
  isPartnerUploadLimitReached,
  recordPartnerDocumentUpload,
  recordPartnerMarketingSubmission,
  setPartnerLogo,
  type PartnerDocumentType,
} from "@/lib/partners/queries";
import { partnerDb, requirePartnerSessionForApi } from "@/lib/partners/session";
import { recordPartnerContactDocument } from "@/lib/partners/network";
import { badRequest, forbiddenOrigin, isSameOrigin, json, notFound, readSmallJson } from "@/lib/portal/http";

// Step 3 of a partner upload. Nothing the browser sends is trusted: the
// blob must sit under a pathname signed for this session's alliance (which
// also fixes WHAT it is: document / marketing / logo / photo), its size and
// real bytes are re-read from storage, and the type is detected from those
// bytes. A file that fails is deleted from storage.

function cleanDisplayName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  return base.replace(/[\u0000-\u001f\u007f<>"]/g, "").trim().slice(-200);
}

async function readAll(stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array | null> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePartnerSessionForApi();
  if (response) return response;
  if (!isBlobConfigured()) return json({ error: "unavailable" }, 503);

  const body = (await readSmallJson(request)) as {
    pathname?: unknown;
    fileName?: unknown;
    documentType?: unknown;
    caption?: unknown;
    contactId?: unknown;
    folder?: unknown;
  } | null;
  if (!body || typeof body.pathname !== "string" || typeof body.fileName !== "string") return badRequest();
  const kind = partnerUploadKindFor(body.pathname, session.allianceId);
  if (!kind) return notFound();

  const fileName = cleanDisplayName(body.fileName);
  const fileKind = portalKindForFileName(fileName);
  if (!fileName || !fileKind || portalKindForFileName(body.pathname) !== fileKind) return badRequest();
  if ((kind === "logo" || kind === "photo") && !["jpeg", "png", "webp"].includes(fileKind)) return badRequest();
  // "My files": a document can go to "Photos & images" — web images only.
  const folder = kind === "document" && body.folder === "photos" ? "photos" : "documents";
  if (folder === "photos" && !["jpeg", "png", "webp"].includes(fileKind)) return badRequest();

  const db = partnerDb();
  let blob;
  try {
    blob = await head(body.pathname);
  } catch {
    return notFound();
  }

  // Idempotent: completing the same upload twice records it once.
  const [existingDoc] = await db
    .select({ id: allianceDocuments.id, allianceId: allianceDocuments.allianceId })
    .from(allianceDocuments)
    .where(eq(allianceDocuments.blobUrl, blob.url))
    .limit(1);
  const [existingAsset] = await db
    .select({ id: marketingContentAssets.id, allianceId: marketingContentAssets.submittedByAllianceId })
    .from(marketingContentAssets)
    .where(eq(marketingContentAssets.blobUrl, blob.url))
    .limit(1);
  const [existingPhoto] = await db
    .select({ allianceId: partnerPhotos.allianceId })
    .from(partnerPhotos)
    .where(eq(partnerPhotos.blobUrl, blob.url))
    .limit(1);
  const [existingLogo] = await db
    .select({ allianceId: partnerProfiles.allianceId })
    .from(partnerProfiles)
    .where(or(eq(partnerProfiles.logoBlobUrl, blob.url)))
    .limit(1);
  const [existingContactDoc] = await db
    .select({ allianceId: partnerContactDocuments.ownerAllianceId })
    .from(partnerContactDocuments)
    .where(eq(partnerContactDocuments.blobUrl, blob.url))
    .limit(1);
  const existing = existingDoc ?? existingAsset ?? existingPhoto ?? existingLogo ?? existingContactDoc;
  if (existing) return existing.allianceId === session.allianceId ? json({ ok: true }) : notFound();

  const reject = async (error: string, status = 400) => {
    await del(blob.url).catch(() => undefined);
    return json({ error }, status);
  };

  if (blob.size > PARTNER_MAX_UPLOAD_BYTES) return reject("too_large");
  if (await isPartnerUploadLimitReached(db, session.allianceId)) return reject("limit_reached", 429);

  const file = await get(blob.url, { access: "private" });
  const bytes = file?.stream ? await readAll(file.stream as ReadableStream<Uint8Array>, PARTNER_MAX_UPLOAD_BYTES) : null;
  if (!bytes) return reject("too_large");
  const check = validatePortalFile(fileName, bytes);
  if (!check.ok) return reject("unsupported_type");

  const actor = `partner-portal:${session.allianceId}`;
  try {
    if (kind === "document") {
      const documentType = (PARTNER_DOCUMENT_TYPES as readonly unknown[]).includes(body.documentType)
        ? (body.documentType as PartnerDocumentType)
        : "other";
      const sensitiveDataReason = await scanFileForSensitiveData(new File([bytes as BlobPart], fileName, { type: check.contentType }));
      const id = await recordPartnerDocumentUpload(db, {
        allianceId: session.allianceId,
        fileName,
        blobUrl: blob.url,
        documentType,
        sensitiveDataReason,
        folder,
      });
      await logAuditEvent({ action: "partner.document_uploaded", entityType: "alliance_document", entityId: id, summary: `Alliance uploaded "${fileName}" (${documentType})`, actor });
    } else if (kind === "contact_document") {
      const sensitiveDataReason = await scanFileForSensitiveData(new File([bytes as BlobPart], fileName, { type: check.contentType }));
      const id = await recordPartnerContactDocument(db, {
        allianceId: session.allianceId,
        contactId: body.contactId,
        fileName,
        blobUrl: blob.url,
        sensitiveDataReason,
      });
      await logAuditEvent({ action: "partner.contact_document_uploaded", entityType: "alliance", entityId: session.allianceId, summary: `Alliance uploaded "${fileName}" for a contact in its network (${id})`, actor });
    } else if (kind === "marketing") {
      const id = await recordPartnerMarketingSubmission(db, {
        allianceId: session.allianceId,
        fileName,
        blobUrl: blob.url,
        caption: typeof body.caption === "string" ? body.caption : "",
      });
      await logAuditEvent({ action: "partner.marketing_submitted", entityType: "marketing_content_asset", entityId: id, summary: `Alliance submitted marketing material "${fileName}" for approval`, actor });
    } else if (kind === "photo") {
      await addPartnerPhoto(db, { allianceId: session.allianceId, blobUrl: blob.url, fileName });
      await logAuditEvent({ action: "partner.photo_added", entityType: "alliance", entityId: session.allianceId, summary: `Alliance added a gallery photo "${fileName}"`, actor });
    } else {
      const previous = await getPartnerLogoUrl(db, session.allianceId);
      await setPartnerLogo(db, session.allianceId, blob.url);
      if (previous) await del(previous).catch(() => undefined);
      await logAuditEvent({ action: "partner.logo_changed", entityType: "alliance", entityId: session.allianceId, summary: "Alliance changed its logo", actor });
    }
  } catch (err) {
    if (err instanceof PartnerLimitError) return reject("photo_limit", 429);
    if (err instanceof PartnerNotFoundError) return reject("not_found", 404);
    throw err;
  }
  return json({ ok: true });
}
