"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { clientHighlevelSync } from "@/lib/db/schema";
import {
  highlevelSyncFormSchema,
  type HighlevelSyncFormValues,
} from "@/lib/validation/highlevel";

export async function upsertClientHighlevelSyncAction(
  clientId: string,
  rawValues: HighlevelSyncFormValues,
) {
  const values = highlevelSyncFormSchema.parse(rawValues);

  const detail = {
    highlevelContactId: values.highlevelContactId || null,
    highlevelOpportunityId: values.highlevelOpportunityId || null,
    highlevelLocationId: values.highlevelLocationId || null,
    highlevelTag: values.highlevelTag || null,
    highlevelPipeline: values.highlevelPipeline || null,
    syncStatus: values.syncStatus,
    syncDirection: values.syncDirection || null,
    updatedAt: new Date(),
  };

  await getDb()
    .insert(clientHighlevelSync)
    .values({ clientId, ...detail })
    .onConflictDoUpdate({
      target: clientHighlevelSync.clientId,
      set: detail,
    });

  revalidatePath(`/clients/${clientId}`);
}
