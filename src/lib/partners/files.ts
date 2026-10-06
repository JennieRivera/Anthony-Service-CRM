import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { portalKindForFileName } from "@/lib/portal/fileTypes";
import { notFound } from "@/lib/portal/http";

// Streams a private Blob file to the signed-in alliance (the caller has
// already checked the file belongs to / is shared with it). PDFs and web
// images open inline; everything else downloads.
export async function streamPrivateFile(request: Request, blobUrl: string, fileName: string) {
  const result = await get(blobUrl, { access: "private" });
  if (!result?.stream) return notFound();
  const kind = portalKindForFileName(fileName);
  const inlineSafe = kind === "pdf" || kind === "jpeg" || kind === "png" || kind === "webp";
  const download = !inlineSafe || new URL(request.url).searchParams.has("download");
  const headers = new Headers({
    "Content-Type": result.blob.contentType || "application/octet-stream",
    "Content-Length": String(result.blob.size),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  });
  const asciiFallback = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  headers.set(
    "Content-Disposition",
    `${download ? "attachment" : "inline"}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  );
  return new NextResponse(result.stream, { headers });
}
