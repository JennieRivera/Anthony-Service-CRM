"use server";

import { and, eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { isBlobConfigured } from "@/lib/blob/config";
import { documents } from "@/lib/db/schema";
import { selectableDocumentCategoryValues } from "@/lib/validation/documentCategory";
import { logAuditEvent } from "@/lib/audit";
import { requireAuthenticatedUser } from "@/lib/permissions";

export async function updateDocumentCategoryAction(
  documentId: string,
  category: string,
) {
  await requireAuthenticatedUser();
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!(selectableDocumentCategoryValues as readonly string[]).includes(category)) {
    throw new Error("Invalid folder");
  }

  const validCategory = category as (typeof selectableDocumentCategoryValues)[number];

  await getDb()
    .update(documents)
    .set({ category: validCategory })
    .where(eq(documents.id, documentId));

  await logAuditEvent({
    action: "document.category_changed",
    entityType: "document",
    entityId: documentId,
    summary: `Moved document to folder: ${validCategory}`,
  });
}

export async function deleteDocumentAction(documentId: string) {
  await requireAuthenticatedUser();
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const db = getDb();
  const [doc] = await db
    .select({
      fileName: documents.fileName,
      blobUrl: documents.blobUrl,
      clientId: documents.clientId,
      caseId: documents.caseId,
    })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!doc) return;

  await db.delete(documents).where(eq(documents.id, documentId));

  // Best-effort: the DB row is already gone either way, so a dangling blob
  // (e.g. storage not configured, or the file was already removed) isn't
  // worth failing the user-facing delete over.
  if (isBlobConfigured()) {
    await del(doc.blobUrl).catch(() => {});
  }

  await logAuditEvent({
    action: "document.deleted",
    entityType: "document",
    entityId: documentId,
    summary: `Deleted document: ${doc.fileName}`,
  });

  revalidatePath(`/clients/${doc.clientId}`);
  if (doc.caseId) revalidatePath(`/cases/${doc.caseId}`);
  revalidatePath("/documents");
}

// Client portal (Step 2A): staff decide, per document, whether the client
// can see and download it in the portal. Default is NOT visible. A
// client's own uploads are always visible to them and can't be hidden.
export async function setDocumentClientVisibilityAction(documentId: string, visible: boolean) {
  await requireAuthenticatedUser();

  const [doc] = await getDb()
    .update(documents)
    .set({ visibleToClient: visible })
    .where(
      visible
        ? eq(documents.id, documentId)
        : and(eq(documents.id, documentId), eq(documents.uploadedByClient, false)),
    )
    .returning({
      fileName: documents.fileName,
      clientId: documents.clientId,
      caseId: documents.caseId,
    });
  if (!doc) return;

  await logAuditEvent({
    action: visible ? "document.shared_with_client" : "document.unshared_with_client",
    entityType: "document",
    entityId: documentId,
    summary: `${visible ? "Made visible" : "Hidden"} in the client portal: ${doc.fileName}`,
  });

  revalidatePath(`/clients/${doc.clientId}`);
  if (doc.caseId) revalidatePath(`/cases/${doc.caseId}`);
}
