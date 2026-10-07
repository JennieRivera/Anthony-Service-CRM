import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { allianceDocuments, allianceDocumentTypeEnum } from "@/lib/db/schema";
import { isBlobConfigured } from "@/lib/blob/config";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getCurrentRole, hasAccessArea } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";
import {
  isAllowedDocumentFile,
  scanFileForSensitiveData,
} from "@/lib/documents/fileValidation";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // B2B Network Foundation, section 14 — this is an API route, not a
  // Server Action, so it uses the same getCurrentRole/hasAccessArea
  // primitives directly instead of the throwing requireAccessArea(),
  // turning a denial into a clean 403 JSON response.
  const role = await getCurrentRole();
  if (!role || !hasAccessArea(role, "alliances")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  const rawDocumentType = formData.get("documentType");

  if (!(file instanceof File) || typeof allianceId !== "string" || !allianceId) {
    return NextResponse.json(
      { error: "A file and allianceId are required." },
      { status: 400 },
    );
  }

  const documentType =
    typeof rawDocumentType === "string" &&
    (allianceDocumentTypeEnum.enumValues as readonly string[]).includes(rawDocumentType)
      ? (rawDocumentType as (typeof allianceDocumentTypeEnum.enumValues)[number])
      : null;

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
      documentType,
      // "My files" folder: web images go to Photos & images (staff can move it).
      folder: /\.(jpe?g|png|webp)$/i.test(file.name) ? "photos" : "documents",
    })
    .returning();

  await logAuditEvent({
    action: "alliance.document_uploaded",
    entityType: "alliance",
    entityId: allianceId,
    summary: `Uploaded document "${file.name}"`,
  });

  return NextResponse.json({ document });
}
