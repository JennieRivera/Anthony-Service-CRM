import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  companies,
  companyDocumentChecklistItems,
  salesTaxCaseDetails,
  irsCaseDetails,
  type CompanyDocumentChecklistItem,
  type IrsCaseDetails,
} from "@/lib/db/schema";

export type ComplianceIndicatorStatus = "green" | "gold" | "red" | "gray";

export type CompanyComplianceSummary = {
  entity: ComplianceIndicatorStatus;
  registeredAgent: ComplianceIndicatorStatus;
  annualReport: ComplianceIndicatorStatus;
  salesTax: ComplianceIndicatorStatus;
  businessLicense: ComplianceIndicatorStatus;
  insurance: ComplianceIndicatorStatus;
  tax: ComplianceIndicatorStatus;
  bookkeeping: ComplianceIndicatorStatus;
  documentCompleteness: ComplianceIndicatorStatus;
  financingReadiness: ComplianceIndicatorStatus;
};

// A checklist category can have several items over time (e.g. one Tax
// Returns entry per year), so the indicator reflects only the most
// recently updated item in that category — older superseded items don't
// drag the color down.
function checklistIndicator(
  items: CompanyDocumentChecklistItem[],
  category: string,
): ComplianceIndicatorStatus {
  const latest = items
    .filter((item) => item.category === category)
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0];
  if (!latest) return "gray";
  if (latest.status === "verified" || latest.status === "received") return "green";
  if (latest.status === "requested" || latest.status === "renewal_due") return "gold";
  return "red"; // expired
}

// Red beats gold beats green beats gray when a company has several open
// cases of the same kind — one past-due filing should surface even if
// three other cases are fine.
function worstOf(colors: ComplianceIndicatorStatus[]): ComplianceIndicatorStatus | null {
  if (colors.length === 0) return null;
  if (colors.includes("red")) return "red";
  if (colors.includes("gold")) return "gold";
  if (colors.includes("green")) return "green";
  return "gray";
}

const SALES_TAX_RED = new Set(["past_due"]);
const SALES_TAX_GREEN = new Set(["approved", "account_active", "filed"]);

// Closed cases don't represent a current obligation either way, so they're
// excluded before this runs — an all-closed history falls through to the
// checklist/required-flag fallback below instead of reading as "green".
function salesTaxCaseColor(status: string): ComplianceIndicatorStatus {
  if (SALES_TAX_RED.has(status)) return "red";
  if (SALES_TAX_GREEN.has(status)) return "green";
  return "gold"; // not_started, research_required, registration_pending, submitted, filing_due
}

function irsCaseColor(row: IrsCaseDetails): ComplianceIndicatorStatus {
  if (row.caseType === "ein_assistance") {
    if (!row.einStatus) return "gray";
    if (row.einStatus === "ein_received" || row.einStatus === "closed") return "green";
    return "gold"; // not_started, information_pending, ready, submitted
  }
  if (row.caseType === "itin_assistance") {
    if (!row.itinStatus) return "gray";
    if (row.itinStatus === "itin_received" || row.itinStatus === "closed") return "green";
    if (row.itinStatus === "additional_information_requested") return "red";
    return "gold";
  }
  // business_account_follow_up, irs_correspondence, other
  if (!row.applicationStatus) return "gray";
  if (row.applicationStatus === "resolved" || row.applicationStatus === "closed") {
    return "green";
  }
  return "gold";
}

export async function getCompanyComplianceSummary(
  companyId: string,
): Promise<CompanyComplianceSummary | null> {
  const db = getDb();

  const [[company], items, salesTaxCases, irsCases] = await Promise.all([
    db.select().from(companies).where(eq(companies.id, companyId)).limit(1),
    db
      .select()
      .from(companyDocumentChecklistItems)
      .where(eq(companyDocumentChecklistItems.companyId, companyId)),
    db
      .select()
      .from(salesTaxCaseDetails)
      .where(eq(salesTaxCaseDetails.companyId, companyId)),
    db
      .select()
      .from(irsCaseDetails)
      .where(eq(irsCaseDetails.companyId, companyId)),
  ]);

  if (!company) return null;

  const entity: ComplianceIndicatorStatus =
    !company.entityType && company.einStatus === "not_started"
      ? "gray"
      : company.entityType && company.formationDate && company.einStatus === "received"
        ? "green"
        : "gold";

  const registeredAgent: ComplianceIndicatorStatus = company.registeredAgent
    ? "green"
    : "gray";

  const annualReport = checklistIndicator(items, "annual_report");

  // Sales Tax — real case data (Phase 5, Session 4) takes priority over the
  // generic document checklist, which was only ever a placeholder signal
  // for companies that don't have a Sales Tax case yet.
  const openSalesTaxCases = salesTaxCases.filter((c) => c.status !== "closed");
  const salesTax: ComplianceIndicatorStatus = !company.salesTaxRequired
    ? "gray"
    : (worstOf(openSalesTaxCases.map((c) => salesTaxCaseColor(c.status))) ??
      checklistIndicator(items, "sales_tax"));

  const businessLicense = checklistIndicator(items, "business_licenses");

  const insuranceChecklist = checklistIndicator(items, "insurance");
  const insurance: ComplianceIndicatorStatus =
    insuranceChecklist !== "gray"
      ? insuranceChecklist
      : company.insuranceStatus
        ? "green"
        : "gray";

  // Tax / IRS administrative standing — real EIN/ITIN/correspondence case
  // data (Phase 5, Session 5) takes priority over the generic tax-returns
  // checklist category, same fallback pattern as Sales Tax above.
  const openIrsCases = irsCases.filter(
    (c) =>
      c.einStatus !== "closed" &&
      c.itinStatus !== "closed" &&
      c.applicationStatus !== "closed",
  );
  const tax: ComplianceIndicatorStatus =
    worstOf(openIrsCases.map(irsCaseColor)) ?? checklistIndicator(items, "tax_returns");

  const bookkeepingChecklist = checklistIndicator(items, "bookkeeping");
  const bookkeeping: ComplianceIndicatorStatus =
    bookkeepingChecklist !== "gray"
      ? bookkeepingChecklist
      : company.bookkeepingSoftware
        ? "green"
        : "gray";

  const trackedTotal = items.length;
  const completed = items.filter(
    (item) => item.status === "verified" || item.status === "received",
  ).length;
  const completionRatio = trackedTotal === 0 ? null : completed / trackedTotal;
  const documentCompleteness: ComplianceIndicatorStatus =
    completionRatio === null
      ? "gray"
      : completionRatio >= 0.8
        ? "green"
        : completionRatio >= 0.5
          ? "gold"
          : "red";

  const financingSignals = [
    company.bankingRelationship,
    company.businessCreditStatus,
  ].filter(Boolean).length;
  const financingReadiness: ComplianceIndicatorStatus = !company.fundingNeeds
    ? "gray"
    : financingSignals === 2
      ? "green"
      : financingSignals === 1
        ? "gold"
        : "red";

  return {
    entity,
    registeredAgent,
    annualReport,
    salesTax,
    businessLicense,
    insurance,
    tax,
    bookkeeping,
    documentCompleteness,
    financingReadiness,
  };
}
