import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { isBlobConfigured } from "@/lib/blob/config";
import { isDatabaseConfigured } from "@/lib/db/config";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isBlobConfigured() || !isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Storage or database is not configured yet." },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const clientId = formData.get("clientId");
  const caseId = formData.get("caseId");
  const documentType = formData.get("documentType");

  if (!(file instanceof File) || typeof clientId !== "string" || !clientId) {
    return NextResponse.json(
      { error: "A file and clientId are required." },
      { status: 400 },
    );
  }

  const blob = await put(`documents/${clientId}/${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  const [document] = await getDb()
    .insert(documents)
    .values({
      clientId,
      caseId: typeof caseId === "string" && caseId ? caseId : null,
      fileName: file.name,
      blobUrl: blob.url,
      documentType:
        typeof documentType === "string" && documentType
          ? documentType
          : null,
      status: "received",
    })
    .returning();

  return NextResponse.json({ document });
}
