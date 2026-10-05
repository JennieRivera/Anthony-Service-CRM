import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { del, get, put } from "@vercel/blob";
import { isBlobConfigured } from "@/lib/blob/config";
import { logAuditEvent } from "@/lib/audit";
import { getPortalPhotoBlobUrl, setPortalPhoto } from "@/lib/portal/account";
import { detectProfilePhotoKind, PROFILE_PHOTO_MAX_BYTES } from "@/lib/portal/photo";
import { portalDb, requirePortalSessionForApi } from "@/lib/portal/session";
import { forbiddenOrigin, isSameOrigin, json, notFound } from "@/lib/portal/http";

// The signed-in client's OWN profile photo: view (GET), replace (POST,
// raw image bytes — already cropped to a square in the browser) and
// remove (DELETE). The client id only ever comes from the session.

export async function GET() {
  const { session, response } = await requirePortalSessionForApi();
  if (response) return response;
  const url = await getPortalPhotoBlobUrl(portalDb(), session.clientId);
  if (!url) return notFound();
  const result = await get(url, { access: "private" }).catch(() => null);
  if (!result?.stream) return notFound();
  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "image/jpeg",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePortalSessionForApi();
  if (response) return response;
  if (!isBlobConfigured()) return json({ error: "unavailable" }, 503);

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > PROFILE_PHOTO_MAX_BYTES) return json({ error: "too_large" }, 400);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0) return json({ error: "unsupported_type" }, 400);
  if (bytes.length > PROFILE_PHOTO_MAX_BYTES) return json({ error: "too_large" }, 400);

  // The real type, from the bytes — never the declared Content-Type.
  const kind = detectProfilePhotoKind(bytes);
  if (!kind) return json({ error: "unsupported_type" }, 400);

  const blob = await put(
    `client-photos/${randomBytes(16).toString("hex")}.${kind.extension}`,
    Buffer.from(bytes),
    { access: "private", contentType: kind.contentType },
  );
  const previous = await setPortalPhoto(portalDb(), session.clientId, blob.url);
  if (previous) await del(previous).catch(() => undefined);

  await logAuditEvent({
    action: "portal.profile_photo_updated",
    entityType: "client",
    entityId: session.clientId,
    summary: "Client updated their profile photo through the portal",
    actor: `client-portal:${session.clientId}`,
  });
  return json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return forbiddenOrigin();
  const { session, response } = await requirePortalSessionForApi();
  if (response) return response;

  const previous = await setPortalPhoto(portalDb(), session.clientId, null);
  if (previous) {
    await del(previous).catch(() => undefined);
    await logAuditEvent({
      action: "portal.profile_photo_removed",
      entityType: "client",
      entityId: session.clientId,
      summary: "Client removed their profile photo through the portal",
      actor: `client-portal:${session.clientId}`,
    });
  }
  return json({ ok: true });
}
