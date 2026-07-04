import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, cases, invoices, appointments, documents } from "@/lib/db/schema";

export async function listClients() {
  return getDb().select().from(clients).orderBy(desc(clients.createdAt));
}

export async function getClientById(id: string) {
  const db = getDb();

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1);

  if (!client) return null;

  const [clientCases, clientInvoices, clientAppointments, clientDocuments] =
    await Promise.all([
      db
        .select()
        .from(cases)
        .where(eq(cases.clientId, id))
        .orderBy(desc(cases.createdAt)),
      db
        .select()
        .from(invoices)
        .where(eq(invoices.clientId, id))
        .orderBy(desc(invoices.createdAt)),
      db
        .select()
        .from(appointments)
        .where(eq(appointments.clientId, id))
        .orderBy(desc(appointments.startAt)),
      db
        .select()
        .from(documents)
        .where(eq(documents.clientId, id))
        .orderBy(desc(documents.createdAt)),
    ]);

  return {
    client,
    cases: clientCases,
    invoices: clientInvoices,
    appointments: clientAppointments,
    documents: clientDocuments,
  };
}
