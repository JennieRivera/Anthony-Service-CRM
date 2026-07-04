import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  cases,
  clients,
  notaryLogEntries,
  apostilleDetails,
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

  const [notaryEntries, apostille] = await Promise.all([
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
  ]);

  return {
    case: row.case,
    client: row.client,
    notaryEntries,
    apostille: apostille[0] ?? null,
  };
}
