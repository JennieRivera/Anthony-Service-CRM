import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { getPortalDocumentFile } from "@/lib/portal/queries";
import { portalKindForFileName } from "@/lib/portal/fileTypes";
import { portalDb, requirePortalSessionForApi } from "@/lib/portal/session";
import { notFound } from "@/lib/portal/http";

// Streams one of the signed-in client's OWN documents (their uploads, or
// one staff marked "Visible to client"). Anything else — another client's
// document, a hidden one, a made-up id — is a plain 404.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, response } = await requirePortalSessionForApi();
  if (response) return response;

  const { id } = await params;
  const document = await getPortalDocumentFile(portalDb(), session.clientId, id);
  if (!document) return notFound();

  const result = await get(document.blobUrl, { access: "private" });
  if (!result?.stream) return notFound();

  const kind = portalKindForFileName(document.fileName);
  const inlineSafe = kind === "pdf" || kind === "jpeg" || kind === "png" || kind === "webp";
  const download = !inlineSafe || new URL(request.url).searchParams.has("download");

  const headers = new Headers({
    "Content-Type": result.blob.contentType || "application/octet-stream",
    "Content-Length": String(result.blob.size),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  });
  const asciiFallback = document.fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  headers.set(
    "Content-Disposition",
    `${download ? "attachment" : "inline"}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
  );
  return new NextResponse(result.stream, { headers });
}
