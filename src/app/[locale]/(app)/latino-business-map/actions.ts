"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { latinoBusinessOpportunityData } from "@/lib/db/schema";
import {
  latinoBusinessDataFormSchema,
  type LatinoBusinessDataFormValues,
} from "@/lib/validation/latinoBusinessMap";
import { logAuditEvent } from "@/lib/audit";

export async function upsertLatinoBusinessDataAction(
  state: string,
  rawValues: LatinoBusinessDataFormValues,
) {
  const values = latinoBusinessDataFormSchema.parse(rawValues);
  const detail = {
    estimatedLatinoPopulation: values.estimatedLatinoPopulation
      ? Number(values.estimatedLatinoPopulation)
      : null,
    estimatedLatinoBusinessPresence: values.estimatedLatinoBusinessPresence
      ? Number(values.estimatedLatinoBusinessPresence)
      : null,
    topIndustries: values.topIndustries || null,
    amsClientsCount: values.amsClientsCount
      ? Number(values.amsClientsCount)
      : null,
    amsLeadsCount: values.amsLeadsCount ? Number(values.amsLeadsCount) : null,
    revenueFromState: values.revenueFromState
      ? Number(values.revenueFromState).toFixed(2)
      : null,
    opportunityScore: values.opportunityScore,
    potentialServices: values.potentialServices || null,
    expansionNotes: values.expansionNotes || null,
    notes: values.notes || null,
    sourceName: values.sourceName || null,
    sourceUrl: values.sourceUrl || null,
    sourceYear: values.sourceYear ? Number(values.sourceYear) : null,
    sourceLastUpdated: values.sourceLastUpdated || null,
    sourceDataType: values.sourceDataType || null,
    verifiedBy: values.verifiedBy || null,
    updatedAt: new Date(),
  };

  await getDb()
    .insert(latinoBusinessOpportunityData)
    .values({ state, ...detail })
    .onConflictDoUpdate({
      target: latinoBusinessOpportunityData.state,
      set: detail,
    });

  await logAuditEvent({
    action: "latino_business_data.updated",
    entityType: "latino_business_opportunity_data",
    entityId: state,
    summary: `Updated Latino business opportunity data for ${state}`,
  });

  revalidatePath("/latino-business-map");
}
