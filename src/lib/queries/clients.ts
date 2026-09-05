import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clients,
  cases,
  invoices,
  appointments,
  documents,
  conversationMessages,
  payments,
  referrals,
  tasks,
  clientCommunicationPreferences,
} from "@/lib/db/schema";

export type TimelineEntry = {
  date: Date;
  type:
    | "case"
    | "invoice"
    | "payment"
    | "appointment"
    | "conversation"
    | "document"
    | "referral"
    | "task";
  label: string;
  href?: string;
};

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

  const [
    clientCases,
    clientInvoices,
    clientAppointments,
    clientDocuments,
    clientConversations,
    clientReferrals,
    clientTasks,
    communicationPreferences,
  ] = await Promise.all([
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
    db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.clientId, id))
      .orderBy(desc(conversationMessages.occurredAt)),
    db
      .select()
      .from(referrals)
      .where(eq(referrals.clientId, id))
      .orderBy(desc(referrals.createdAt)),
    db
      .select()
      .from(tasks)
      .where(eq(tasks.clientId, id))
      .orderBy(desc(tasks.createdAt)),
    db
      .select()
      .from(clientCommunicationPreferences)
      .where(eq(clientCommunicationPreferences.clientId, id))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  // Payments don't carry clientId directly — they hang off an invoice —
  // so they're fetched as a second pass once we know this client's invoices.
  const invoiceIds = clientInvoices.map((invoice) => invoice.id);
  const clientPayments = invoiceIds.length
    ? await db
        .select()
        .from(payments)
        .where(inArray(payments.invoiceId, invoiceIds))
        .orderBy(desc(payments.createdAt))
    : [];

  const activeCases = clientCases.filter(
    (c) => c.status !== "completed" && c.status !== "cancelled",
  );
  const closedCases = clientCases.filter(
    (c) => c.status === "completed" || c.status === "cancelled",
  );

  // Same heuristic already used on the Dashboard: any invoice not paid or
  // cancelled counts toward the outstanding balance.
  const outstandingBalance = clientInvoices
    .filter(
      (invoice) => invoice.status !== "paid" && invoice.status !== "cancelled",
    )
    .reduce((sum, invoice) => sum + Number(invoice.total), 0);

  const invoiceById = new Map(clientInvoices.map((inv) => [inv.id, inv]));

  const timeline: TimelineEntry[] = [
    ...clientCases.map((c) => ({
      date: c.createdAt,
      type: "case" as const,
      label: c.title,
      href: `/cases/${c.id}`,
    })),
    ...clientInvoices.map((inv) => ({
      date: inv.createdAt,
      type: "invoice" as const,
      label: `INV-${String(inv.invoiceSeq).padStart(5, "0")}`,
      href: `/invoices/${inv.id}`,
    })),
    ...clientPayments.map((p) => {
      const inv = invoiceById.get(p.invoiceId);
      return {
        date: p.createdAt,
        type: "payment" as const,
        label: inv
          ? `Payment: INV-${String(inv.invoiceSeq).padStart(5, "0")}`
          : "Payment",
        href: `/payments/${p.id}`,
      };
    }),
    ...clientAppointments.map((a) => ({
      date: a.createdAt,
      type: "appointment" as const,
      label: a.title,
      href: `/appointments/${a.id}/edit`,
    })),
    ...clientConversations.map((c) => ({
      date: c.createdAt,
      type: "conversation" as const,
      label: c.subject || c.summary.slice(0, 60),
    })),
    ...clientDocuments.map((d) => ({
      date: d.createdAt,
      type: "document" as const,
      label: d.fileName,
    })),
    ...clientReferrals.map((r) => ({
      date: r.createdAt,
      type: "referral" as const,
      label: `REF-${String(r.referralSeq).padStart(5, "0")}`,
      href: `/referrals/${r.id}`,
    })),
    ...clientTasks.map((task) => ({
      date: task.createdAt,
      type: "task" as const,
      label: task.title,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    client,
    cases: clientCases,
    activeCases,
    closedCases,
    invoices: clientInvoices,
    appointments: clientAppointments,
    documents: clientDocuments,
    conversations: clientConversations,
    referrals: clientReferrals,
    tasks: clientTasks,
    payments: clientPayments,
    outstandingBalance,
    timeline,
    communicationPreferences,
  };
}
