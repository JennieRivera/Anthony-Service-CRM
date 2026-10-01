import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { associationsChambers, clients, companies } from "@/lib/db/schema";

export async function listAssociationsChambers(state?: string) {
  return getDb()
    .select()
    .from(associationsChambers)
    .where(state ? eq(associationsChambers.state, state) : undefined)
    .orderBy(desc(associationsChambers.createdAt));
}

export async function listAssociationsChambersForSelect() {
  return getDb()
    .select({
      id: associationsChambers.id,
      organizationName: associationsChambers.organizationName,
    })
    .from(associationsChambers)
    .orderBy(associationsChambers.organizationName);
}

export async function getAssociationChamberById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(associationsChambers)
    .where(eq(associationsChambers.id, id))
    .limit(1);
  if (!row) return null;

  const [linkedClient, linkedCompany] = await Promise.all([
    row.contactClientId
      ? db
          .select({ id: clients.id, fullName: clients.fullName })
          .from(clients)
          .where(eq(clients.id, row.contactClientId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : null,
    row.companyId
      ? db
          .select({ id: companies.id, legalBusinessName: companies.legalBusinessName })
          .from(companies)
          .where(eq(companies.id, row.companyId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : null,
  ]);

  return { ...row, linkedClient, linkedCompany };
}
