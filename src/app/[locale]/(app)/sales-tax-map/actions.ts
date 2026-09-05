"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { salesTaxStateInfo } from "@/lib/db/schema";
import {
  salesTaxStateInfoFormSchema,
  type SalesTaxStateInfoFormValues,
} from "@/lib/validation/salesTaxMap";
import { logAuditEvent } from "@/lib/audit";

export async function upsertSalesTaxStateInfoAction(
  state: string,
  rawValues: SalesTaxStateInfoFormValues,
) {
  const values = salesTaxStateInfoFormSchema.parse(rawValues);
  const detail = {
    stateTaxAgency: values.stateTaxAgency || null,
    officialWebsite: values.officialWebsite || null,
    registrationLink: values.registrationLink || null,
    filingPortalLink: values.filingPortalLink || null,
    businessRegistrationLink: values.businessRegistrationLink || null,
    notes: values.notes || null,
    lastVerifiedDate: values.lastVerifiedDate || null,
    verifiedBy: values.verifiedBy || null,
    updatedAt: new Date(),
  };

  await getDb()
    .insert(salesTaxStateInfo)
    .values({ state, ...detail })
    .onConflictDoUpdate({ target: salesTaxStateInfo.state, set: detail });

  await logAuditEvent({
    action: "sales_tax_state_info.updated",
    entityType: "sales_tax_state_info",
    entityId: state,
    summary: `Updated sales tax reference info for ${state}`,
  });

  revalidatePath("/sales-tax-map");
}
