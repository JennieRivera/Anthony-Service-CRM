import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { getMarketingContentAssetById } from "@/lib/queries/marketingContent";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const asset = await getMarketingContentAssetById(id);
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await get(asset.blobUrl, { access: "private" });
  if (!result) {
    return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", result.blob.contentType || "application/octet-stream");
  headers.set("Content-Length", String(result.blob.size));

  const forceDownload = new URL(request.url).searchParams.has("download");
  if (forceDownload) {
    const asciiFallback = asset.fileName.replace(/[^\x20-\x7E]/g, "_");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(asset.fileName)}`,
    );
  }

  return new NextResponse(result.stream, { headers });
}
