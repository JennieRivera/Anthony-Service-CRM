import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isUuid } from "@/lib/partners/queries";
import { getPartnerFileUrlForStaff } from "@/lib/partners/staff";
import { streamPrivateFile } from "@/lib/partners/files";
import { getDb } from "@/lib/db";
import { getPartnerContactDocumentForStaff } from "@/lib/partners/network";
import type { PortalDb } from "@/lib/portal/db";

// Staff view of an alliance's partner-portal logo (?logo), gallery photo
// (?photo=<id>) or a document it uploaded for a contact in its network
// (?contactDoc=<id>). Private Blob, streamed after the staff auth() check.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const search = new URL(request.url).searchParams;
  const contactDoc = search.get("contactDoc");
  if (contactDoc !== null) {
    if (!isUuid(id) || !isUuid(contactDoc)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const doc = await getPartnerContactDocumentForStaff(getDb() as unknown as PortalDb, id, contactDoc);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return streamPrivateFile(request, doc.url, doc.fileName);
  }
  const photo = search.get("photo");
  if (!isUuid(id) || (photo !== null && !isUuid(photo))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const url = await getPartnerFileUrlForStaff(id, photo ? { photoId: photo } : "logo");
  if (!url) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return streamPrivateFile(request, url, url.split("/").pop() ?? "image");
}
