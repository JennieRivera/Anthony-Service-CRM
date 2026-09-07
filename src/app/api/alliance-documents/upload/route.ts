import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { allianceDocuments } from "@/lib/db/schema";
import { isBlobConfigured } from "@/lib/blob/config";
import { isDatabaseConfigured } from "@/lib/db/config";
import {
  isAllowedDocumentFile,
  scanFileForSensitiveData,
} from "@/lib/documents/fileValidation";

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
  const allianceId = formData.get("allianceId");

  if (!(file instanceof File) || typeof allianceId !== "string" || !allianceId) {
    return NextResponse.json(
      { error: "A file and allianceId are required." },
      { status: 400 },
    );
  }

  if (!isAllowedDocumentFile(file.name)) {
    return NextResponse.json(
      { error: "Unsupported file type.", code: "unsupported_type" },
      { status: 400 },
    );
  }

  const sensitiveReason = await scanFileForSensitiveData(file);
  if (sensitiveReason) {
    return NextResponse.json(
      { error: "File appears to contain sensitive data.", code: "sensitive_data", reason: sensitiveReason },
      { status: 400 },
    );
  }

  const blob = await put(`alliance-documents/${allianceId}/${file.name}`, file, {
    access: "private",
    addRandomSuffix: true,
  });

  const [document] = await getDb()
    .insert(allianceDocuments)
    .values({
      allianceId,
      fileName: file.name,
      blobUrl: blob.url,
    })
    .returning();

  return NextResponse.json({ document });
}
