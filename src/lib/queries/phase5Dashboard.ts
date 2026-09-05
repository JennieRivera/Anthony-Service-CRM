import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  cases,
  salesTaxCaseDetails,
  irsCaseDetails,
  associationsChambers,
  latinoBusinessOpportunityData,
} from "@/lib/db/schema";
import { listCompanies } from "./companies";
import { getCompanyComplianceSummary } from "./companyCompliance";

const CHAMBER_TYPES = new Set(["latino_chamber", "chamber_of_commerce"]);

// Phase 5, Session 8 — Dashboard Sections (spec section 16).
export async function getPhase5DashboardData() {
  const db = getDb();

  const [
    allCompanies,
    salesTaxRows,
    irsRows,
    immigrationCases,
    associationRows,
    latinoRows,
  ] = await Promise.all([
    listCompanies(),
    db.select().from(salesTaxCaseDetails),
    db.select().from(irsCaseDetails),
    db
      .select({ id: cases.id, status: cases.status })
      .from(cases)
      .where(eq(cases.serviceType, "immigration")),
    db.select().from(associationsChambers),
    db.select().from(latinoBusinessOpportunityData),
  ]);

  const companiesByState = new Map<string, number>();
  for (const company of allCompanies) {
    if (!company.stateOfFormation) continue;
    companiesByState.set(
      company.stateOfFormation,
      (companiesByState.get(company.stateOfFormation) ?? 0) + 1,
    );
  }
  const statesWithCompanies = companiesByState.size;

  const activeSalesTaxCases = salesTaxRows.filter((r) => r.status !== "closed");
  const salesTaxDue = salesTaxRows.filter(
    (r) => r.status === "filing_due" || r.status === "past_due",
  );

  const einCases = irsRows.filter(
    (r) => r.caseType === "ein_assistance" && r.einStatus !== "closed",
  );
  const itinCases = irsRows.filter(
    (r) => r.caseType === "itin_assistance" && r.itinStatus !== "closed",
  );

  const activeImmigrationCases = immigrationCases.filter(
    (c) => c.status !== "completed" && c.status !== "cancelled",
  ).length;

  const latinoOpportunityStates = latinoRows.filter(
    (r) => r.opportunityScore !== "insufficient_data",
  ).length;
  const expansionStates = latinoRows.filter(
    (r) => r.opportunityScore === "very_high" || r.opportunityScore === "high",
  ).length;

  const activeAssociations = associationRows.filter(
    (r) =>
      r.active &&
      (r.amsRelationshipStatus === "member" ||
        r.amsRelationshipStatus === "strategic_partner"),
  ).length;
  const strategicChambers = associationRows.filter(
    (r) =>
      r.active &&
      CHAMBER_TYPES.has(r.organizationType) &&
      r.amsRelationshipStatus === "strategic_partner",
  ).length;

  const complianceSummaries = await Promise.all(
    allCompanies.map((c) => getCompanyComplianceSummary(c.id)),
  );
  const companyComplianceAlerts = complianceSummaries.filter(
    (summary) =>
      summary &&
      Object.values(summary).some((status) => status === "red" || status === "gold"),
  ).length;

  return {
    companiesRegistered: allCompanies.length,
    companiesByStateCount: statesWithCompanies,
    salesTaxCases: activeSalesTaxCases.length,
    salesTaxDue: salesTaxDue.length,
    einCases: einCases.length,
    itinCases: itinCases.length,
    immigrationCases: activeImmigrationCases,
    latinoBusinessOpportunities: latinoOpportunityStates,
    activeAssociations,
    strategicChambers,
    expansionStates,
    companyComplianceAlerts,
  };
}
