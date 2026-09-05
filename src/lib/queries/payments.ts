import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { payments, invoices, clients } from "@/lib/db/schema";

export async function listInvoicesForSelect() {
  return getDb()
    .select({
      id: invoices.id,
      invoiceSeq: invoices.invoiceSeq,
      total: invoices.total,
      issueDate: invoices.issueDate,
      clientName: clients.fullName,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .orderBy(desc(invoices.createdAt));
}

export async function getInvoiceForPayment(invoiceId: string) {
  const [row] = await getDb()
    .select({
      id: invoices.id,
      invoiceSeq: invoices.invoiceSeq,
      total: invoices.total,
      issueDate: invoices.issueDate,
    })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  return row ?? null;
}

export async function listPaymentsWithInvoice() {
  return getDb()
    .select({
      id: payments.id,
      status: payments.status,
      amountTotal: payments.amountTotal,
      amountPaid: payments.amountPaid,
      balanceDue: payments.balanceDue,
      paymentDate: payments.paymentDate,
      refundStatus: payments.refundStatus,
      invoiceId: invoices.id,
      invoiceSeq: invoices.invoiceSeq,
      invoiceIssueDate: invoices.issueDate,
      clientName: clients.fullName,
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .orderBy(desc(payments.createdAt));
}

export async function getPaymentById(id: string) {
  const [row] = await getDb()
    .select({
      payment: payments,
      invoiceId: invoices.id,
      invoiceSeq: invoices.invoiceSeq,
      invoiceIssueDate: invoices.issueDate,
      clientId: clients.id,
      clientName: clients.fullName,
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(eq(payments.id, id))
    .limit(1);

  return row ?? null;
}
