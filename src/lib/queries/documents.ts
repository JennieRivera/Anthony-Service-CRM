import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { documents, clients, cases } from "@/lib/db/schema";

export async function listDocumentsForClient(clientId: string) {
  return getDb()
    .select()
    .from(documents)
    .where(eq(documents.clientId, clientId))
    .orderBy(desc(documents.createdAt));
}

export async function listDocumentsForCase(caseId: string) {
  return getDb()
    .select()
    .from(documents)
    .where(eq(documents.caseId, caseId))
    .orderBy(desc(documents.createdAt));
}

export async function listAllDocuments() {
  return getDb()
    .select({
      id: documents.id,
      createdAt: documents.createdAt,
      fileName: documents.fileName,
      blobUrl: documents.blobUrl,
      documentType: documents.documentType,
      status: documents.status,
      clientId: clients.id,
      clientName: clients.fullName,
      caseTitle: cases.title,
    })
    .from(documents)
    .innerJoin(clients, eq(documents.clientId, clients.id))
    .leftJoin(cases, eq(documents.caseId, cases.id))
    .orderBy(desc(documents.createdAt));
}
