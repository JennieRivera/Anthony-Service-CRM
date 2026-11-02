import { getDb } from "@/lib/db";
import { integrationSettings } from "@/lib/db/schema";
import { INTEGRATION_DEFINITIONS } from "@/lib/integrations";
import { NOTICE_FROM_EMAIL, isEmailConfigured, isSmsConfigured } from "@/lib/notifications/providers";

// The email and SMS cards report what the notification engine can really
// use today, so they always agree with /settings/notifications.
function liveProviderState(key: string) {
  if (key === "email_provider" && isEmailConfigured()) {
    return { status: "connected" as const, connectedAccount: NOTICE_FROM_EMAIL() };
  }
  if (key === "sms_provider" && isSmsConfigured()) {
    return { status: "connected" as const, connectedAccount: "Twilio" };
  }
  return { status: "not_connected" as const, connectedAccount: null };
}

export async function listIntegrationSettings() {
  const rows = await getDb().select().from(integrationSettings);
  const rowByKey = new Map(rows.map((r) => [r.integrationKey, r]));

  return INTEGRATION_DEFINITIONS.map((def) => {
    const row = rowByKey.get(def.key);
    if (def.managedBy === "notifications") {
      return {
        ...def,
        ...liveProviderState(def.key),
        lastSyncAt: null,
        lastError: null,
        notes: row?.notes ?? null,
      };
    }
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
