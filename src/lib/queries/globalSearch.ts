import { ilike, or, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, cases, companies, appointments, referrals, invoices, documents } from "@/lib/db/schema";

const RESULT_LIMIT = 5;

export type GlobalSearchResult = {
  id: string;
  label: string;
  sublabel: string | null;
  href: string;
};

export type GlobalSearchResults = {
  clients: GlobalSearchResult[];
  cases: GlobalSearchResult[];
  companies: GlobalSearchResult[];
  appointments: GlobalSearchResult[];
  referrals: GlobalSearchResult[];
  invoices: GlobalSearchResult[];
  documents: GlobalSearchResult[];
};

const EMPTY: GlobalSearchResults = {
  clients: [],
  cases: [],
  companies: [],
  appointments: [],
  referrals: [],
  invoices: [],
  documents: [],
};

// Mirrors the digits-only phone comparison already used on /clients
// (ClientTable.tsx) — a formatted "(407) 555-0108" won't match a plain-text
// ilike for "407-555-0108" or "4075550108" typed into the search box.
//
// Phase 1 (AMS CRM V2 master prompt section 8 / approval item 10) —
// extended to referrals, invoices, and documents, the three additional
// sources explicitly approved. Leads, Students, and Courses are
// deliberately NOT included: none of those have an approved data model
// yet (Leads is still just `clients.status = 'lead'`, with no pipeline;
// Students are cases, already covered by the `cases` search below;
// Courses don't exist as records at all).
export async function globalSearch(rawQuery: string): Promise<GlobalSearchResults> {
  const query = rawQuery.trim();
  if (!query) {
    return EMPTY;
  }

  const digits = query.replace(/\D/g, "");
  const pattern = `%${query}%`;
  const db = getDb();

  const matchedClients = await db
    .select({
      id: clients.id,
      fullName: clients.fullName,
      email: clients.email,
      phone: clients.phone,
    })
    .from(clients);

  const clientResults = matchedClients
    .filter((c) => {
      if (c.fullName.toLowerCase().includes(query.toLowerCase())) return true;
      if (c.email && c.email.toLowerCase().includes(query.toLowerCase())) return true;
      if (digits.length > 0 && c.phone && c.phone.replace(/\D/g, "").includes(digits)) {
        return true;
      }
      return false;
    })
    .slice(0, RESULT_LIMIT)
    .map((c) => ({
      id: c.id,
      label: c.fullName,
      sublabel: c.email ?? c.phone ?? null,
      href: `/clients/${c.id}`,
    }));

  const matchedCases = await db
    .select({
      id: cases.id,
      title: cases.title,
      clientFullName: clients.fullName,
    })
    .from(cases)
    .innerJoin(clients, eq(cases.clientId, clients.id))
    .where(or(ilike(cases.title, pattern), ilike(clients.fullName, pattern)))
    .limit(RESULT_LIMIT);

  const caseResults = matchedCases.map((c) => ({
    id: c.id,
    label: c.title,
    sublabel: c.clientFullName,
    href: `/cases/${c.id}`,
  }));

  const matchedCompanies = await db
    .select({
      id: companies.id,
      legalBusinessName: companies.legalBusinessName,
      dbaName: companies.dbaName,
    })
    .from(companies)
    .where(
      or(
        ilike(companies.legalBusinessName, pattern),
        ilike(companies.dbaName, pattern),
      ),
    )
    .limit(RESULT_LIMIT);

  const companyResults = matchedCompanies.map((c) => ({
    id: c.id,
    label: c.legalBusinessName,
    sublabel: c.dbaName,
    href: `/companies/${c.id}`,
  }));

  const matchedAppointments = await db
    .select({
      id: appointments.id,
      title: appointments.title,
      clientFullName: clients.fullName,
    })
    .from(appointments)
    .innerJoin(clients, eq(appointments.clientId, clients.id))
    .where(or(ilike(appointments.title, pattern), ilike(clients.fullName, pattern)))
    .limit(RESULT_LIMIT);

  const appointmentResults = matchedAppointments.map((a) => ({
    id: a.id,
    label: a.title,
    sublabel: a.clientFullName,
    href: `/appointments/${a.id}`,
  }));

  const matchedReferrals = await db
    .select({
      id: referrals.id,
      referralSeq: referrals.referralSeq,
      referredBy: referrals.referredBy,
      receivingParty: referrals.receivingParty,
      clientFullName: clients.fullName,
    })
    .from(referrals)
    .innerJoin(clients, eq(referrals.clientId, clients.id))
    .where(
      or(
        ilike(clients.fullName, pattern),
        ilike(referrals.referredBy, pattern),
        ilike(referrals.receivingParty, pattern),
      ),
    )
    .limit(RESULT_LIMIT);

  const referralResults = matchedReferrals.map((r) => ({
    id: r.id,
    label: `REF-${String(r.referralSeq).padStart(5, "0")}`,
    sublabel: r.clientFullName,
    href: `/referrals/${r.id}`,
  }));

  const matchedInvoices = await db
    .select({
      id: invoices.id,
      invoiceSeq: invoices.invoiceSeq,
      clientFullName: clients.fullName,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(ilike(clients.fullName, pattern))
    .limit(RESULT_LIMIT);

  const invoiceResults = matchedInvoices.map((i) => ({
    id: i.id,
    label: `INV-${String(i.invoiceSeq).padStart(5, "0")}`,
    sublabel: i.clientFullName,
    href: `/invoices/${i.id}`,
  }));

  const matchedDocuments = await db
    .select({
      id: documents.id,
      fileName: documents.fileName,
      clientId: documents.clientId,
      clientFullName: clients.fullName,
    })
    .from(documents)
    .innerJoin(clients, eq(documents.clientId, clients.id))
    .where(or(ilike(documents.fileName, pattern), ilike(clients.fullName, pattern)))
    .limit(RESULT_LIMIT);

  // No standalone document detail page exists — the file lives inside its
  // client's Documents tab, so that's what a result opens (see
  // src/components/documents/downloadHref.ts for the alternative, the
  // authenticated file-stream API route, which isn't a CRM page and isn't
  // locale-aware, so it's not used for client-side router navigation here).
  const documentResults = matchedDocuments.map((d) => ({
    id: d.id,
    label: d.fileName,
    sublabel: d.clientFullName,
    href: `/clients/${d.clientId}`,
  }));

  return {
    clients: clientResults,
    cases: caseResults,
    companies: companyResults,
    appointments: appointmentResults,
    referrals: referralResults,
    invoices: invoiceResults,
    documents: documentResults,
  };
}
