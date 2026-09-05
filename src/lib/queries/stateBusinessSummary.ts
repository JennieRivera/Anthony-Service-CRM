import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  companies,
  clients,
  cases,
  invoices,
  salesTaxCaseDetails,
  referrals,
  rriReferralDetails,
  associationsChambers,
  latinoBusinessOpportunityData,
} from "@/lib/db/schema";

const CHAMBER_TYPES = new Set(["latino_chamber", "chamber_of_commerce"]);

export type StateBusinessSummary = {
  companiesCount: number;
  clientsCount: number;
  revenuePaid: number;
  topServiceTypes: { serviceType: string; count: number }[];
  salesTaxClientsCount: number;
  rriReferralsCount: number;
  associationsCount: number;
  chambersCount: number;
  latinoOpportunity: {
    score: string;
    estimatedLatinoPopulation: number | null;
  } | null;
};

// Phase 5, Session 8 — Map + Company Integration (spec section 15).
// "Clients by State" and "Revenue by State" are necessarily computed via
// each client's linked Company (companies.stateOfFormation) — clients
// have no state field of their own, so an individual client with no
// company attached isn't counted here. That's a known, documented limit
// rather than a bug: it's the only real state signal that exists today.
export async function getStateBusinessSummary(
  state: string,
): Promise<StateBusinessSummary> {
  const db = getDb();

  const [stateCompanies, orgRows, latinoInfo] = await Promise.all([
    db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.stateOfFormation, state)),
    db
      .select({ organizationType: associationsChambers.organizationType })
      .from(associationsChambers)
      .where(eq(associationsChambers.state, state)),
    db
      .select()
      .from(latinoBusinessOpportunityData)
      .where(eq(latinoBusinessOpportunityData.state, state))
      .limit(1),
  ]);

  const companyIds = stateCompanies.map((c) => c.id);

  if (companyIds.length === 0) {
    return {
      companiesCount: 0,
      clientsCount: 0,
      revenuePaid: 0,
      topServiceTypes: [],
      salesTaxClientsCount: 0,
      rriReferralsCount: 0,
      associationsCount: orgRows.filter((r) => !CHAMBER_TYPES.has(r.organizationType))
        .length,
      chambersCount: orgRows.filter((r) => CHAMBER_TYPES.has(r.organizationType))
        .length,
      latinoOpportunity: latinoInfo[0]
        ? {
            score: latinoInfo[0].opportunityScore,
            estimatedLatinoPopulation: latinoInfo[0].estimatedLatinoPopulation,
          }
        : null,
    };
  }

  const stateClients = await db
    .select({ id: clients.id })
    .from(clients)
    .where(inArray(clients.companyId, companyIds));
  const clientIds = stateClients.map((c) => c.id);

  const [stateCases, stateInvoices, stateSalesTaxCases, stateReferrals] =
    clientIds.length > 0
      ? await Promise.all([
          db
            .select({ serviceType: cases.serviceType, clientId: cases.clientId })
            .from(cases)
            .where(inArray(cases.clientId, clientIds)),
          db
            .select({ total: invoices.total, status: invoices.status })
            .from(invoices)
            .where(inArray(invoices.clientId, clientIds)),
          db
            .select({ caseId: salesTaxCaseDetails.caseId })
            .from(salesTaxCaseDetails)
            .innerJoin(cases, eq(salesTaxCaseDetails.caseId, cases.id))
            .where(inArray(cases.clientId, clientIds)),
          db
            .select({ id: referrals.id })
            .from(referrals)
            .innerJoin(rriReferralDetails, eq(rriReferralDetails.referralId, referrals.id))
            .where(inArray(referrals.clientId, clientIds)),
        ])
      : [[], [], [], []];

  const revenuePaid = stateInvoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + Number(inv.total), 0);

  const serviceCounts = new Map<string, number>();
  for (const c of stateCases) {
    serviceCounts.set(c.serviceType, (serviceCounts.get(c.serviceType) ?? 0) + 1);
  }
  const topServiceTypes = [...serviceCounts.entries()]
    .map(([serviceType, count]) => ({ serviceType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    companiesCount: companyIds.length,
    clientsCount: clientIds.length,
    revenuePaid,
    topServiceTypes,
    salesTaxClientsCount: stateSalesTaxCases.length,
    rriReferralsCount: stateReferrals.length,
    associationsCount: orgRows.filter((r) => !CHAMBER_TYPES.has(r.organizationType))
      .length,
    chambersCount: orgRows.filter((r) => CHAMBER_TYPES.has(r.organizationType)).length,
    latinoOpportunity: latinoInfo[0]
      ? {
          score: latinoInfo[0].opportunityScore,
          estimatedLatinoPopulation: latinoInfo[0].estimatedLatinoPopulation,
        }
      : null,
  };
}
