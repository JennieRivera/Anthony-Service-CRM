import { asc, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { partnerServices, strategicAlliances } from "@/lib/db/schema";

// "Alliance directory" (staff only): every ally — the ones AMS added and
// the ones its allies added in their portals — with who added each one.
export type DirectoryRow = {
  id: string;
  organizationName: string;
  organizationType: string | null;
  services: string[];
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  status: string;
  addedByAllianceId: string | null;
  addedByName: string | null;
  createdAt: string;
};

export async function listAllianceDirectory(ids?: string[]): Promise<DirectoryRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: strategicAlliances.id,
      organizationName: strategicAlliances.organizationName,
      organizationType: strategicAlliances.organizationType,
      servicesConnected: strategicAlliances.servicesConnected,
      city: strategicAlliances.city,
      state: strategicAlliances.state,
      phone: strategicAlliances.phone,
      email: strategicAlliances.email,
      contactPerson: strategicAlliances.contactPerson,
      status: strategicAlliances.status,
      addedByAllianceId: strategicAlliances.addedByAllianceId,
      createdAt: strategicAlliances.createdAt,
    })
    .from(strategicAlliances)
    .where(ids ? inArray(strategicAlliances.id, ids) : undefined)
    .orderBy(asc(strategicAlliances.organizationName));
  // Who added each one (a self-join confuses the query types, so it is a
  // second, small query).
  const adderIds = [...new Set(rows.map((r) => r.addedByAllianceId).filter((x): x is string => Boolean(x)))];
  const adders = adderIds.length
    ? await db
        .select({ id: strategicAlliances.id, name: strategicAlliances.organizationName })
        .from(strategicAlliances)
        .where(inArray(strategicAlliances.id, adderIds))
    : [];
  const adderName = new Map(adders.map((a) => [a.id, a.name]));
  const services = rows.length
    ? await db
        .select({ allianceId: partnerServices.allianceId, name: partnerServices.name })
        .from(partnerServices)
        .where(
          inArray(
            partnerServices.allianceId,
            rows.map((r) => r.id),
          ),
        )
        .orderBy(asc(partnerServices.createdAt))
    : [];
  return rows.map(({ servicesConnected, createdAt, ...r }) => {
    // The ally's own "My services" list; otherwise what staff/the ally typed.
    const own = services.filter((s) => s.allianceId === r.id).map((s) => s.name);
    return {
      ...r,
      addedByName: r.addedByAllianceId ? (adderName.get(r.addedByAllianceId) ?? null) : null,
      services: own.length > 0 ? own : servicesConnected ? [servicesConnected] : [],
      createdAt: createdAt.toISOString(),
    };
  });
}
