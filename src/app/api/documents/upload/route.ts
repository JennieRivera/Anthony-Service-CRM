import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { isBlobConfigured } from "@/lib/blob/config";
import { isDatabaseConfigured } from "@/lib/db/config";
import { immigrationDocumentFolderValues } from "@/lib/validation/immigrationDocumentFolder";
import { selectableDocumentCategoryValues } from "@/lib/validation/documentCategory";
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
  const clientId = formData.get("clientId");
  const caseId = formData.get("caseId");
  const documentType = formData.get("documentType");
  const folder = formData.get("folder");
  const validFolder =
    typeof folder === "string" &&
    (immigrationDocumentFolderValues as readonly string[]).includes(folder)
      ? (folder as (typeof immigrationDocumentFolderValues)[number])
      : null;

  const category = formData.get("category");
  // A fine immigration sub-folder always implies the "immigration" general
  // folder — never picked by hand alongside it (see documentCategory.ts).
  const validCategory = validFolder
    ? ("immigration" as const)
    : typeof category === "string" &&
        (selectableDocumentCategoryValues as readonly string[]).includes(category)
      ? (category as (typeof selectableDocumentCategoryValues)[number])
      : null;

  if (!(file instanceof File) || typeof clientId !== "string" || !clientId) {
    return NextResponse.json(
      { error: "A file and clientId are required." },
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
      folder: validFolder,
      category: validCategory,
      status: "received",
    })
    .returning();

  return NextResponse.json({ document });
}
