import { getDb } from "@/lib/db";
import {
  salesTaxStateInfo,
  irsResources,
  immigrationForms,
  associationsChambers,
  latinoBusinessOpportunityData,
} from "@/lib/db/schema";

const STALE_AFTER_DAYS = 180;

export type DataFreshnessAlert = {
  module: "sales_tax_map" | "irs_resources" | "immigration_forms" | "associations" | "latino_business_map";
  label: string;
  lastVerifiedDate: string | null;
  href: string;
};

function isStale(lastVerifiedDate: string | null): boolean {
  if (!lastVerifiedDate) return true;
  const ageMs = Date.now() - new Date(lastVerifiedDate).getTime();
  return ageMs > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

// Phase 5, Session 8 — Data Freshness (spec section 18): flags any
// official-resource reference row (map state info, IRS resources, USCIS
// forms, associations) that has never been verified or hasn't been
// reviewed in 180+ days. Only active/current rows are checked — a
// retired IRS resource or immigration form doesn't need re-verification.
export async function getDataFreshnessAlerts(): Promise<DataFreshnessAlert[]> {
  const db = getDb();
  const [stateInfoRows, resourceRows, formRows, orgRows, latinoRows] =
    await Promise.all([
      db.select().from(salesTaxStateInfo),
      db.select().from(irsResources),
      db.select().from(immigrationForms),
      db.select().from(associationsChambers),
      db.select().from(latinoBusinessOpportunityData),
    ]);

  const alerts: DataFreshnessAlert[] = [];

  for (const row of stateInfoRows) {
    if (isStale(row.lastVerifiedDate)) {
      alerts.push({
        module: "sales_tax_map",
        label: `Sales Tax — ${row.state}`,
        lastVerifiedDate: row.lastVerifiedDate,
        href: "/sales-tax-map",
      });
    }
  }

  for (const row of resourceRows) {
    if (row.active && isStale(row.lastVerifiedDate)) {
      alerts.push({
        module: "irs_resources",
        label: row.name,
        lastVerifiedDate: row.lastVerifiedDate,
        href: "/irs-resources",
      });
    }
  }

  for (const row of formRows) {
    if (row.active && isStale(row.lastVerifiedDate)) {
      alerts.push({
        module: "immigration_forms",
        label: `${row.formNumber} — ${row.formName}`,
        lastVerifiedDate: row.lastVerifiedDate,
        href: "/immigration-forms",
      });
    }
  }

  for (const row of orgRows) {
    if (row.active && isStale(row.lastVerifiedDate)) {
      alerts.push({
        module: "associations",
        label: row.organizationName,
        lastVerifiedDate: row.lastVerifiedDate,
        href: `/associations/${row.id}`,
      });
    }
  }

  for (const row of latinoRows) {
    if (isStale(row.sourceLastUpdated)) {
      alerts.push({
        module: "latino_business_map",
        label: `Latino Business Data — ${row.state}`,
        lastVerifiedDate: row.sourceLastUpdated,
        href: "/latino-business-map",
      });
    }
  }

  return alerts;
}
