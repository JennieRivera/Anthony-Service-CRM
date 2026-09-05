"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { clientHighlevelSync } from "@/lib/db/schema";
import {
  highlevelSyncFormSchema,
  type HighlevelSyncFormValues,
} from "@/lib/validation/highlevel";
import { logAuditEvent } from "@/lib/audit";

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

  await logAuditEvent({
    action: "integration.updated",
    entityType: "client_highlevel_sync",
    entityId: clientId,
    summary: `HighLevel sync updated for client (status: ${detail.syncStatus})`,
  });

  revalidatePath(`/clients/${clientId}`);
}
