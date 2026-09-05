import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  companies,
  companyDocumentChecklistItems,
  type CompanyDocumentChecklistItem,
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

// The Sales Tax / Tax status indicators derive from the generic document
// checklist for now. They'll get richer, purpose-built data once the Sales
// Tax module (Phase 5 Session 4) and IRS module (Session 5) exist, at which
// point those live case statuses should replace this placeholder signal.
export async function getCompanyComplianceSummary(
  companyId: string,
): Promise<CompanyComplianceSummary | null> {
  const db = getDb();

  const [[company], items] = await Promise.all([
    db.select().from(companies).where(eq(companies.id, companyId)).limit(1),
    db
      .select()
      .from(companyDocumentChecklistItems)
      .where(eq(companyDocumentChecklistItems.companyId, companyId)),
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

  const salesTax: ComplianceIndicatorStatus = !company.salesTaxRequired
    ? "gray"
    : checklistIndicator(items, "sales_tax");

  const businessLicense = checklistIndicator(items, "business_licenses");

  const insuranceChecklist = checklistIndicator(items, "insurance");
  const insurance: ComplianceIndicatorStatus =
    insuranceChecklist !== "gray"
      ? insuranceChecklist
      : company.insuranceStatus
        ? "green"
        : "gray";

  const tax = checklistIndicator(items, "tax_returns");

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
