import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { invoices, invoiceLineItems, clients, cases } from "@/lib/db/schema";

export async function listInvoicesWithClient() {
  return getDb()
    .select({
      id: invoices.id,
      invoiceSeq: invoices.invoiceSeq,
      status: invoices.status,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      total: invoices.total,
      clientId: clients.id,
      clientName: clients.fullName,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .orderBy(desc(invoices.createdAt));
}

export async function getInvoiceById(id: string) {
  const db = getDb();

  const [row] = await db
    .select({
      invoice: invoices,
      client: clients,
      caseTitle: cases.title,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(cases, eq(invoices.caseId, cases.id))
    .where(eq(invoices.id, id))
    .limit(1);

  if (!row) return null;

  const lineItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, id))
    .orderBy(invoiceLineItems.sortOrder);

  return {
    invoice: row.invoice,
    client: row.client,
    caseTitle: row.caseTitle,
    lineItems,
  };
}
