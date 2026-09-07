import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { documents, clients, cases, referrals } from "@/lib/db/schema";

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

export async function listDocumentsForReferral(referralId: string) {
  return getDb()
    .select()
    .from(documents)
    .where(eq(documents.referralId, referralId))
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
      folder: documents.folder,
      category: documents.category,
      clientId: clients.id,
      clientName: clients.fullName,
      folderNumber: clients.folderNumber,
      caseId: cases.id,
      caseTitle: cases.title,
      serviceType: cases.serviceType,
      referralId: documents.referralId,
    })
    .from(documents)
    .innerJoin(clients, eq(documents.clientId, clients.id))
    .leftJoin(cases, eq(documents.caseId, cases.id))
    .orderBy(desc(documents.createdAt));
}

// Sub-folders for the "Referidos y Alianzas" drawer — one per referral,
// labeled by its existing sequence number and the referred client's name.
export async function listReferralsForFolders() {
  return getDb()
    .select({
      id: referrals.id,
      referralSeq: referrals.referralSeq,
      clientId: clients.id,
      clientName: clients.fullName,
      receivingParty: referrals.receivingParty,
      originatingBusiness: referrals.originatingBusiness,
      category: referrals.category,
      status: referrals.status,
      allianceId: referrals.allianceId,
    })
    .from(referrals)
    .innerJoin(clients, eq(referrals.clientId, clients.id))
    .orderBy(referrals.referralSeq);
}
