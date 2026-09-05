import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  cases,
  clients,
  notaryLogEntries,
  apostilleDetails,
  notaryServiceDetails,
  taxServiceDetails,
  bookkeepingServiceDetails,
  immigrationServiceDetails,
  creditServiceDetails,
  consultingServiceDetails,
  businessFormationDetails,
  documents,
  caseStatusHistory,
} from "@/lib/db/schema";

export async function listCasesWithClient() {
  return getDb()
    .select({
      id: cases.id,
      createdAt: cases.createdAt,
      title: cases.title,
      serviceType: cases.serviceType,
      status: cases.status,
      dueDate: cases.dueDate,
      fee: cases.fee,
      clientId: clients.id,
      clientName: clients.fullName,
    })
    .from(cases)
    .innerJoin(clients, eq(cases.clientId, clients.id))
    .orderBy(desc(cases.createdAt));
}

export async function listClientsForSelect() {
  return getDb()
    .select({ id: clients.id, fullName: clients.fullName })
    .from(clients)
    .orderBy(clients.fullName);
}

export async function getCaseById(id: string) {
  const db = getDb();

  const [row] = await db
    .select({
      case: cases,
      client: clients,
    })
    .from(cases)
    .innerJoin(clients, eq(cases.clientId, clients.id))
    .where(eq(cases.id, id))
    .limit(1);

  if (!row) return null;

  const [
    notaryEntries,
    apostille,
    notaryDetails,
    taxDetails,
    bookkeepingDetails,
    immigrationDetails,
    creditDetails,
    consultingDetails,
    formationDetails,
    caseDocuments,
    statusHistory,
  ] = await Promise.all([
    db
      .select()
      .from(notaryLogEntries)
      .where(eq(notaryLogEntries.caseId, id))
      .orderBy(desc(notaryLogEntries.entryDate)),
    db
      .select()
      .from(apostilleDetails)
      .where(eq(apostilleDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(notaryServiceDetails)
      .where(eq(notaryServiceDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(taxServiceDetails)
      .where(eq(taxServiceDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(bookkeepingServiceDetails)
      .where(eq(bookkeepingServiceDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(immigrationServiceDetails)
      .where(eq(immigrationServiceDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(creditServiceDetails)
      .where(eq(creditServiceDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(consultingServiceDetails)
      .where(eq(consultingServiceDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(businessFormationDetails)
      .where(eq(businessFormationDetails.caseId, id))
      .limit(1),
    db
      .select()
      .from(documents)
      .where(eq(documents.caseId, id))
      .orderBy(desc(documents.createdAt)),
    db
      .select()
      .from(caseStatusHistory)
      .where(eq(caseStatusHistory.caseId, id))
      .orderBy(desc(caseStatusHistory.changedAt)),
  ]);

  return {
    case: row.case,
    client: row.client,
    notaryEntries,
    apostille: apostille[0] ?? null,
    notaryDetails: notaryDetails[0] ?? null,
    taxDetails: taxDetails[0] ?? null,
    bookkeepingDetails: bookkeepingDetails[0] ?? null,
    immigrationDetails: immigrationDetails[0] ?? null,
    creditDetails: creditDetails[0] ?? null,
    consultingDetails: consultingDetails[0] ?? null,
    formationDetails: formationDetails[0] ?? null,
    documents: caseDocuments,
    statusHistory,
  };
}
