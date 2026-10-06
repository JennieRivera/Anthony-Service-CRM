import { del, get, head } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { documents } from "@/lib/db/schema";
import { isBlobConfigured } from "@/lib/blob/config";
import { logAuditEvent } from "@/lib/audit";
import { scanFileForSensitiveData } from "@/lib/documents/fileValidation";
import { PORTAL_MAX_UPLOAD_BYTES } from "@/lib/portal/config";
import { portalKindForFileName, validatePortalFile } from "@/lib/portal/fileTypes";
import { isUploadPathnameForClient } from "@/lib/portal/tokens";
import {
  PortalNotFoundError,
  isClientUploadLimitReached,
  isUuid,
  recordClientUpload,
} from "@/lib/portal/queries";
import { portalDb, requirePortalSessionForApi } from "@/lib/portal/session";
import { badRequest, forbiddenOrigin, isSameOrigin, json, notFound, readSmallJson } from "@/lib/portal/http";
import { notifyOwnerDocumentUploaded } from "@/lib/notifications/engine";
import { sendNoticeAfter } from "@/lib/notifications/server";

// Step 3 of a portal upload. Nothing the browser sends is trusted: the
// blob must sit under a pathname signed for this session's client, its
// size and real bytes are re-read from Blob storage, and the file type is
// detected from those bytes. A file that fails is deleted from storage.
// Files that look like they contain an SSN/ITIN/card number are ACCEPTED
// (clients send W-2s and immigration forms) but flagged for staff.

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
  const { session, response } = await requirePortalSessionForApi();
  if (response) return response;
  if (!isBlobConfigured()) return json({ error: "unavailable" }, 503);

  const body = (await readSmallJson(request)) as { pathname?: unknown; fileName?: unknown; caseId?: unknown } | null;
  if (!body || typeof body.pathname !== "string" || typeof body.fileName !== "string") return badRequest();
  if (!isUploadPathnameForClient(body.pathname, session.clientId)) return notFound();

  const caseId = body.caseId == null ? null : isUuid(body.caseId) ? body.caseId : undefined;
  if (caseId === undefined) return notFound();

  const fileName = cleanDisplayName(body.fileName);
  const kind = portalKindForFileName(fileName);
  if (!fileName || !kind || portalKindForFileName(body.pathname) !== kind) return badRequest();

  const db = portalDb();
  let blob;
  try {
    blob = await head(body.pathname);
  } catch {
    return notFound();
  }

  // Idempotent: completing the same upload twice records it once.
  const [existing] = await db
    .select({ id: documents.id, clientId: documents.clientId })
    .from(documents)
    .where(eq(documents.blobUrl, blob.url))
    .limit(1);
  if (existing) return existing.clientId === session.clientId ? json({ ok: true }) : notFound();

  const reject = async (error: string, status = 400) => {
    await del(blob.url).catch(() => undefined);
    return json({ error }, status);
  };

  if (blob.size > PORTAL_MAX_UPLOAD_BYTES) return reject("too_large");
  if (await isClientUploadLimitReached(db, session.clientId)) return reject("limit_reached", 429);

  const file = await get(blob.url, { access: "private" });
  const bytes = file?.stream ? await readAll(file.stream as ReadableStream<Uint8Array>, PORTAL_MAX_UPLOAD_BYTES) : null;
  if (!bytes) return reject("too_large");

  const check = validatePortalFile(fileName, bytes);
  if (!check.ok) return reject("unsupported_type");

  const sensitiveDataReason = await scanFileForSensitiveData(
    new File([bytes as BlobPart], fileName, { type: check.contentType }),
  );

  try {
    const { documentId } = await recordClientUpload(db, {
      clientId: session.clientId,
      caseId,
      fileName,
      blobUrl: blob.url,
      sensitiveDataReason,
    });
    await logAuditEvent({
      action: "portal.document_uploaded",
      entityType: "document",
      entityId: documentId,
      summary: `Client uploaded "${fileName}" through the portal${sensitiveDataReason ? ` (may contain sensitive data: ${sensitiveDataReason})` : ""}`,
      actor: `client-portal:${session.clientId}`,
    });
    const clientId = session.clientId;
    sendNoticeAfter("owner_document_uploaded", (db, deps) =>
      notifyOwnerDocumentUploaded(db, { documentId, clientId }, deps),
    );
  } catch (err) {
    if (err instanceof PortalNotFoundError) return reject("not_found", 404);
    throw err;
  }
  return json({ ok: true });
}
