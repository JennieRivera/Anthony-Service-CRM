import { ilike, or, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, cases, companies, appointments } from "@/lib/db/schema";

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
};

// Mirrors the digits-only phone comparison already used on /clients
// (ClientTable.tsx) — a formatted "(407) 555-0108" won't match a plain-text
// ilike for "407-555-0108" or "4075550108" typed into the search box.
export async function globalSearch(rawQuery: string): Promise<GlobalSearchResults> {
  const query = rawQuery.trim();
  if (!query) {
    return { clients: [], cases: [], companies: [], appointments: [] };
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

  return {
    clients: clientResults,
    cases: caseResults,
    companies: companyResults,
    appointments: appointmentResults,
  };
}
