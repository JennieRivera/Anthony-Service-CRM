import { getDb } from "@/lib/db";
import { integrationSettings } from "@/lib/db/schema";
import { INTEGRATION_DEFINITIONS } from "@/lib/integrations";

export async function listIntegrationSettings() {
  const rows = await getDb().select().from(integrationSettings);
  const rowByKey = new Map(rows.map((r) => [r.integrationKey, r]));

  return INTEGRATION_DEFINITIONS.map((def) => {
    const row = rowByKey.get(def.key);
    return {
      ...def,
      status: row?.status ?? ("not_connected" as const),
      lastSyncAt: row?.lastSyncAt ?? null,
      lastError: row?.lastError ?? null,
      connectedAccount: row?.connectedAccount ?? null,
      notes: row?.notes ?? null,
    };
  });
}
