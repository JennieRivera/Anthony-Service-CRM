import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  companies,
  companyOwners,
  companyContacts,
  companyAuthorizedRepresentatives,
  clients,
  cases,
  invoices,
  appointments,
  documents,
  conversationMessages,
  referrals,
  tasks,
  payments,
} from "@/lib/db/schema";

export type CompanyTimelineEntry = {
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

export async function listCompanies(state?: string) {
  return getDb()
    .select()
    .from(companies)
    .where(state ? eq(companies.stateOfFormation, state) : undefined)
    .orderBy(desc(companies.createdAt));
}

export async function listCompaniesForSelect() {
  return getDb()
    .select({ id: companies.id, legalBusinessName: companies.legalBusinessName })
    .from(companies)
    .orderBy(companies.legalBusinessName);
}

export async function getCompanyById(id: string) {
  const db = getDb();

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, id))
    .limit(1);

  if (!company) return null;

  const [owners, contacts, representatives, linkedClients] = await Promise.all([
    db
      .select()
      .from(companyOwners)
      .where(eq(companyOwners.companyId, id))
      .orderBy(desc(companyOwners.ownershipPercentage)),
    db
      .select()
      .from(companyContacts)
      .where(eq(companyContacts.companyId, id))
      .orderBy(companyContacts.name),
    db
      .select()
      .from(companyAuthorizedRepresentatives)
      .where(eq(companyAuthorizedRepresentatives.companyId, id))
      .orderBy(companyAuthorizedRepresentatives.name),
    db
      .select({ id: clients.id, fullName: clients.fullName })
      .from(clients)
      .where(eq(clients.companyId, id)),
  ]);

  return { company, owners, contacts, representatives, linkedClients };
}

// Company 360 — aggregates activity across every client linked to this
// company (clients.companyId), rather than storing any of it redundantly on
// the company itself. A company with no linked clients yet simply has no
// activity to show.
export async function getCompany360Data(companyId: string) {
  const db = getDb();

  const linkedClients = await db
    .select({ id: clients.id, fullName: clients.fullName })
    .from(clients)
    .where(eq(clients.companyId, companyId));

  const clientIds = linkedClients.map((c) => c.id);
  const clientNameById = new Map(linkedClients.map((c) => [c.id, c.fullName]));

  if (clientIds.length === 0) {
    return {
      linkedClients,
      cases: [],
      invoices: [],
      appointments: [],
      documents: [],
      conversations: [],
      referrals: [],
      tasks: [],
      payments: [],
      outstandingBalance: 0,
      timeline: [] as CompanyTimelineEntry[],
    };
  }

  const [
    companyCases,
    companyInvoices,
    companyAppointments,
    companyDocuments,
    companyConversations,
    companyReferrals,
    companyTasks,
  ] = await Promise.all([
    db.select().from(cases).where(inArray(cases.clientId, clientIds)).orderBy(desc(cases.createdAt)),
    db
      .select()
      .from(invoices)
      .where(inArray(invoices.clientId, clientIds))
      .orderBy(desc(invoices.createdAt)),
    db
      .select()
      .from(appointments)
      .where(inArray(appointments.clientId, clientIds))
      .orderBy(desc(appointments.startAt)),
    db
      .select()
      .from(documents)
      .where(inArray(documents.clientId, clientIds))
      .orderBy(desc(documents.createdAt)),
    db
      .select()
      .from(conversationMessages)
      .where(inArray(conversationMessages.clientId, clientIds))
      .orderBy(desc(conversationMessages.occurredAt)),
    db
      .select()
      .from(referrals)
      .where(inArray(referrals.clientId, clientIds))
      .orderBy(desc(referrals.createdAt)),
    db.select().from(tasks).where(inArray(tasks.clientId, clientIds)).orderBy(desc(tasks.createdAt)),
  ]);

  const invoiceIds = companyInvoices.map((inv) => inv.id);
  const companyPayments = invoiceIds.length
    ? await db
        .select()
        .from(payments)
        .where(inArray(payments.invoiceId, invoiceIds))
        .orderBy(desc(payments.createdAt))
    : [];

  const invoiceById = new Map(companyInvoices.map((inv) => [inv.id, inv]));

  const outstandingBalance = companyInvoices
    .filter((invoice) => invoice.status !== "paid" && invoice.status !== "cancelled")
    .reduce((sum, invoice) => sum + Number(invoice.total), 0);

  const timeline: CompanyTimelineEntry[] = [
    ...companyCases.map((c) => ({
      date: c.createdAt,
      type: "case" as const,
      label: `${c.title} — ${clientNameById.get(c.clientId) ?? ""}`,
      href: `/cases/${c.id}`,
    })),
    ...companyInvoices.map((inv) => ({
      date: inv.createdAt,
      type: "invoice" as const,
      label: `INV-${String(inv.invoiceSeq).padStart(5, "0")} — ${clientNameById.get(inv.clientId) ?? ""}`,
      href: `/invoices/${inv.id}`,
    })),
    ...companyPayments.map((p) => {
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
    ...companyAppointments.map((a) => ({
      date: a.createdAt,
      type: "appointment" as const,
      label: `${a.title} — ${clientNameById.get(a.clientId) ?? ""}`,
      href: `/appointments/${a.id}/edit`,
    })),
    ...companyConversations.map((c) => ({
      date: c.createdAt,
      type: "conversation" as const,
      label: `${c.subject || c.summary.slice(0, 60)} — ${clientNameById.get(c.clientId) ?? ""}`,
    })),
    ...companyDocuments.map((d) => ({
      date: d.createdAt,
      type: "document" as const,
      label: `${d.fileName} — ${clientNameById.get(d.clientId) ?? ""}`,
    })),
    ...companyReferrals.map((r) => ({
      date: r.createdAt,
      type: "referral" as const,
      label: `REF-${String(r.referralSeq).padStart(5, "0")}`,
      href: `/referrals/${r.id}`,
    })),
    ...companyTasks.map((task) => ({
      date: task.createdAt,
      type: "task" as const,
      label: `${task.title} — ${clientNameById.get(task.clientId) ?? ""}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    linkedClients,
    cases: companyCases,
    invoices: companyInvoices,
    appointments: companyAppointments,
    documents: companyDocuments,
    conversations: companyConversations,
    referrals: companyReferrals,
    tasks: companyTasks,
    payments: companyPayments,
    outstandingBalance,
    timeline,
  };
}
