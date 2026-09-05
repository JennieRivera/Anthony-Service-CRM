import { getDb } from "@/lib/db";
import {
  latinoBusinessOpportunityData,
  associationsChambers,
  strategicAlliances,
} from "@/lib/db/schema";
import type { LatinoBusinessOpportunityData } from "@/lib/db/schema";

const CHAMBER_TYPES = new Set(["latino_chamber", "chamber_of_commerce"]);

export type LatinoBusinessMapStateData = {
  info: LatinoBusinessOpportunityData | null;
  associationsCount: number;
  chambersCount: number;
  strategicPartnersCount: number;
};

// Associations/Chambers and Strategic Partners are computed live from
// their own directories (grouped by state) rather than duplicated as
// static numbers here — same anti-duplication approach used throughout
// Phase 5. AMS Clients/Leads/Revenue remain admin-entered on
// latinoBusinessOpportunityData until Session 8 (Map + Company
// Integration) wires them to real client/case data by state.
export async function getLatinoBusinessMapData(): Promise<
  Record<string, LatinoBusinessMapStateData>
> {
  const db = getDb();
  const [infoRows, orgRows, allianceRows] = await Promise.all([
    db.select().from(latinoBusinessOpportunityData),
    db
      .select({
        state: associationsChambers.state,
        organizationType: associationsChambers.organizationType,
      })
      .from(associationsChambers),
    db
      .select({ state: strategicAlliances.state, status: strategicAlliances.status })
      .from(strategicAlliances),
  ]);

  const infoByState = new Map(infoRows.map((row) => [row.state, row]));
  const states = new Set([
    ...infoByState.keys(),
    ...orgRows.filter((r) => r.state).map((r) => r.state as string),
    ...allianceRows.filter((r) => r.state).map((r) => r.state as string),
  ]);

  const data: Record<string, LatinoBusinessMapStateData> = {};
  for (const state of states) {
    const stateOrgs = orgRows.filter((r) => r.state === state);
    data[state] = {
      info: infoByState.get(state) ?? null,
      associationsCount: stateOrgs.filter(
        (r) => !CHAMBER_TYPES.has(r.organizationType),
      ).length,
      chambersCount: stateOrgs.filter((r) => CHAMBER_TYPES.has(r.organizationType))
        .length,
      strategicPartnersCount: allianceRows.filter(
        (r) => r.state === state && r.status === "active_partner",
      ).length,
    };
  }

  return data;
}
