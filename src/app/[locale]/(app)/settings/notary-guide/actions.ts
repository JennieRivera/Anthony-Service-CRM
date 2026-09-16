"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { notaryStateGuide } from "@/lib/db/schema";
import {
  notaryStateGuideFormSchema,
  type NotaryStateGuideFormValues,
} from "@/lib/validation/notaryStateGuide";
import { logAuditEvent } from "@/lib/audit";

export async function updateNotaryStateGuideAction(
  state: string,
  rawValues: NotaryStateGuideFormValues,
) {
  const values = notaryStateGuideFormSchema.parse(rawValues);
  const detail = {
    officialAgency: values.officialAgency || null,
    officialWebsite: values.officialWebsite || null,
    commissionLink: values.commissionLink || null,
    examLink: values.examLink || null,
    requirementsLink: values.requirementsLink || null,
    sourceUrl: values.sourceUrl || null,
    status: values.status,
    // Every save re-stamps today's date, regardless of what changed.
    lastVerifiedDate: new Date().toISOString().slice(0, 10),
    updatedAt: new Date(),
  };

  await getDb()
    .insert(notaryStateGuide)
    .values({ state, ...detail })
    .onConflictDoUpdate({ target: notaryStateGuide.state, set: detail });

  await logAuditEvent({
    action: "notary_state_guide.updated",
    entityType: "notary_state_guide",
    entityId: state,
    summary: `Updated National Notary State Guide entry for ${state}`,
  });

  revalidatePath("/settings/notary-guide");
  revalidatePath("/notary-state-guide");
}
