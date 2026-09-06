"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { selectableDocumentCategoryValues } from "@/lib/validation/documentCategory";
import { logAuditEvent } from "@/lib/audit";

export async function updateDocumentCategoryAction(
  documentId: string,
  category: string,
) {
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
