import { desc, eq, inArray, or, ilike } from "drizzle-orm";
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
  companies,
} from "@/lib/db/schema";

// Calendar enhancement, Session 2 (CALENDAR-PLAN.md section 3) — "search
// before creating, never duplicate". Phone/email are compared digit- and
// case-normalized since staff enters them free-form during a live call;
// business name goes through the Company Master Registry (clients have no
// business-name field of their own — only an optional companyId) and
// matches whichever clients are linked to a company whose name matches.
// The client table is small enough for this business that fetching every
// row and filtering in JS (the same style already used in dashboard.ts) is
// simpler and safer than hand-rolling normalization in SQL.
export async function searchClientsForMatch(query: {
  phone?: string;
  email?: string;
  businessName?: string;
}) {
  const db = getDb();
  const normalizedPhone = query.phone?.replace(/\D/g, "") || undefined;
  const normalizedEmail = query.email?.trim().toLowerCase() || undefined;
  const businessName = query.businessName?.trim() || undefined;

  if (!normalizedPhone && !normalizedEmail && !businessName) return [];

  const matchedCompanyIds = businessName
    ? (
        await db
          .select({ id: companies.id })
          .from(companies)
          .where(
            or(
              ilike(companies.legalBusinessName, `%${businessName}%`),
              ilike(companies.dbaName, `%${businessName}%`),
            ),
          )
      ).map((c) => c.id)
    : [];

  const candidates = await db
    .select({
      id: clients.id,
      fullName: clients.fullName,
      email: clients.email,
      phone: clients.phone,
      status: clients.status,
      companyId: clients.companyId,
    })
    .from(clients);

  return candidates
    .filter((c) => {
      if (normalizedPhone && c.phone && c.phone.replace(/\D/g, "") === normalizedPhone) {
        return true;
      }
      if (normalizedEmail && c.email && c.email.toLowerCase() === normalizedEmail) {
        return true;
      }
      if (matchedCompanyIds.length > 0 && c.companyId && matchedCompanyIds.includes(c.companyId)) {
        return true;
      }
      return false;
    })
    .slice(0, 10);
}

export type ClientDuplicateMatchReason = "email" | "phone" | "name";

export type ClientDuplicateMatch = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: (typeof clients.$inferSelect)["status"];
  matchReasons: ClientDuplicateMatchReason[];
  services: string[];
};

function normalizeFullName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchRank(reasons: ClientDuplicateMatchReason[]) {
  if (reasons.includes("email")) return 3;
  if (reasons.includes("phone")) return 2;
  return 1;
}

// Phase 2A — Master Person Identity Safety Net. A soft, informational
// duplicate check surfaced to staff before a new clients row is created
// (New Client form, Academy New Student search, Diamond Community
// non-student member entry) — it only ever *suggests*, never merges,
// deletes, or blocks. Email and phone are normalized the same way as
// searchClientsForMatch above (digit-only phone, lowercased email); full
// name is matched case-/whitespace-insensitively but is deliberately the
// weakest signal (two different real people can share a name), so every
// caller must treat "name" as a hint, not grounds to refuse creation.
// Short normalized phone fragments (<7 digits) are ignored to avoid noisy
// false positives on partially-typed numbers.
export async function findPossibleDuplicateClients(query: {
  fullName?: string;
  email?: string;
  phone?: string;
}): Promise<ClientDuplicateMatch[]> {
  const db = getDb();
  const normalizedEmail = query.email?.trim().toLowerCase() || undefined;
  const normalizedPhone = query.phone?.replace(/\D/g, "") || undefined;
  const normalizedName = query.fullName
    ? normalizeFullName(query.fullName)
    : undefined;

  if (!normalizedEmail && !normalizedPhone && !normalizedName) return [];

  const candidates = await db
    .select({
      id: clients.id,
      fullName: clients.fullName,
      email: clients.email,
      phone: clients.phone,
      status: clients.status,
    })
    .from(clients);

  const matches = candidates
    .map((c) => {
      const reasons: ClientDuplicateMatchReason[] = [];
      if (
        normalizedEmail &&
        c.email &&
        c.email.trim().toLowerCase() === normalizedEmail
      ) {
        reasons.push("email");
      }
      if (
        normalizedPhone &&
        normalizedPhone.length >= 7 &&
        c.phone &&
        c.phone.replace(/\D/g, "") === normalizedPhone
      ) {
        reasons.push("phone");
      }
      if (normalizedName && normalizeFullName(c.fullName) === normalizedName) {
        reasons.push("name");
      }
      return { ...c, reasons };
    })
    .filter((c) => c.reasons.length > 0)
    .sort((a, b) => matchRank(b.reasons) - matchRank(a.reasons))
    .slice(0, 10);

  if (matches.length === 0) return [];

  const matchedIds = matches.map((m) => m.id);
  const serviceRows = await db
    .selectDistinct({
      clientId: cases.clientId,
      serviceType: cases.serviceType,
    })
    .from(cases)
    .where(inArray(cases.clientId, matchedIds));

  const servicesByClient = new Map<string, string[]>();
  for (const row of serviceRows) {
    const list = servicesByClient.get(row.clientId) ?? [];
    list.push(row.serviceType);
    servicesByClient.set(row.clientId, list);
  }

  return matches.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    email: m.email,
    phone: m.phone,
    status: m.status,
    matchReasons: m.reasons,
    services: servicesByClient.get(m.id) ?? [],
  }));
}

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
  // Conversations: the channel, shown next to the label.
  channel?: (typeof conversationMessages.channel.enumValues)[number];
};

export async function listClients() {
  return getDb().select().from(clients).orderBy(desc(clients.createdAt));
}

// Lightweight select-list helper, same shape/purpose as
// listCompaniesForSelect() — for pickers that link an existing client
// (alliance/association contact, Diamond Community member) without
// loading every column.
export async function listClientsForSelect() {
  return getDb()
    .select({ id: clients.id, fullName: clients.fullName })
    .from(clients)
    .orderBy(clients.fullName);
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
      href: `/appointments/${a.id}`,
    })),
    ...clientConversations.map((c) => ({
      date: c.createdAt,
      type: "conversation" as const,
      label: c.subject || c.summary.slice(0, 60),
      href: `/communications/${c.id}`,
      channel: c.channel,
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
