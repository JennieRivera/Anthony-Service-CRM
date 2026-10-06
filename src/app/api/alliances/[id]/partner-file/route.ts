import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isUuid } from "@/lib/partners/queries";
import { getPartnerFileUrlForStaff } from "@/lib/partners/staff";
import { streamPrivateFile } from "@/lib/partners/files";

// Staff view of an alliance's partner-portal logo (?logo) or gallery photo
// (?photo=<id>). Private Blob, streamed after the staff auth() check.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const photo = new URL(request.url).searchParams.get("photo");
  if (!isUuid(id) || (photo !== null && !isUuid(photo))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const url = await getPartnerFileUrlForStaff(id, photo ? { photoId: photo } : "logo");
  if (!url) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return streamPrivateFile(request, url, url.split("/").pop() ?? "image");
}
