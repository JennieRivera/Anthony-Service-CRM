import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  companies,
  companyOwners,
  companyContacts,
  companyAuthorizedRepresentatives,
  clients,
} from "@/lib/db/schema";

export async function listCompanies() {
  return getDb().select().from(companies).orderBy(desc(companies.createdAt));
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
