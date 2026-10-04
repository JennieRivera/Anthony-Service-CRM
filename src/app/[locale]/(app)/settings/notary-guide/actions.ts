"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { notaryStateGuide } from "@/lib/db/schema";
import {
  notaryStateGuideFormSchema,
  type NotaryStateGuideFormValues,
} from "@/lib/validation/notaryStateGuide";
import { logAuditEvent } from "@/lib/audit";
import { businessDateString } from "@/lib/dates";
import { requireAccessArea } from "@/lib/permissions";

export async function updateNotaryStateGuideAction(
  state: string,
  rawValues: NotaryStateGuideFormValues,
) {
  await requireAccessArea("settings");
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
    lastVerifiedDate: businessDateString(),
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
