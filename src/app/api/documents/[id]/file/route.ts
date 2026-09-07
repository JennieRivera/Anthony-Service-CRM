import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { documents } from "@/lib/db/schema";

// The one and only way a document's bytes reach a browser. The store is
// private (spec: notary/immigration/tax documents), so there's no public
// URL to link to — this route checks auth() and streams the file through
// our own server using the Blob read-write token.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [document] = await getDb()
    .select()
    .from(documents)
    .where(eq(documents.id, id));

  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await get(document.blobUrl, { access: "private" });
  if (!result) {
    return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", result.blob.contentType || "application/octet-stream");
  headers.set("Content-Length", String(result.blob.size));

  const forceDownload = new URL(request.url).searchParams.has("download");
  if (forceDownload) {
    const asciiFallback = document.fileName.replace(/[^\x20-\x7E]/g, "_");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
    );
  }

  return new NextResponse(result.stream, { headers });
}
