"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { integrationSettings } from "@/lib/db/schema";
import { getIntegrationDefinition } from "@/lib/integrations";
import { logAuditEvent } from "@/lib/audit";

async function ensureRow(integrationKey: string) {
  await getDb()
    .insert(integrationSettings)
    .values({ integrationKey })
    .onConflictDoNothing({ target: integrationSettings.integrationKey });
}

// Checks only whether the integration's env var is *set* on the server —
// it never reads, returns, or logs the value itself. There is no real API
// call here yet since no integration has credentials configured; this is
// an honest "is it configured" check standing in for a live connection
// test until one is built.
export async function testIntegrationConnectionAction(integrationKey: string) {
  const definition = getIntegrationDefinition(integrationKey);
  if (!definition) throw new Error("Unknown integration");

  await ensureRow(integrationKey);

  const configured = definition.envVarName
    ? Boolean(process.env[definition.envVarName])
    : null;

  const db = getDb();
  if (configured === null) {
    await db
      .update(integrationSettings)
      .set({
        lastError: null,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(integrationSettings.integrationKey, integrationKey));
  } else if (configured) {
    await db
      .update(integrationSettings)
      .set({
        status: "ready",
        lastError: null,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(integrationSettings.integrationKey, integrationKey));
  } else {
    await db
      .update(integrationSettings)
      .set({
        status: "not_connected",
        lastError: `Missing ${definition.envVarName} environment variable`,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(integrationSettings.integrationKey, integrationKey));
  }

  await logAuditEvent({
    action: "integration.tested",
    entityType: "integration_settings",
    entityId: integrationKey,
    summary: `Tested connection for ${integrationKey} (configured: ${configured ?? "n/a"})`,
  });

  revalidatePath("/settings/integrations");
}

export async function disconnectIntegrationAction(integrationKey: string) {
  await ensureRow(integrationKey);
  await getDb()
    .update(integrationSettings)
    .set({
      status: "not_connected",
      connectedAccount: null,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(integrationSettings.integrationKey, integrationKey));

  await logAuditEvent({
    action: "integration.disconnected",
    entityType: "integration_settings",
    entityId: integrationKey,
    summary: `Disconnected ${integrationKey}`,
  });

  revalidatePath("/settings/integrations");
}

export async function updateIntegrationNotesAction(
  integrationKey: string,
  notes: string,
) {
  await ensureRow(integrationKey);
  await getDb()
    .update(integrationSettings)
    .set({ notes: notes || null, updatedAt: new Date() })
    .where(eq(integrationSettings.integrationKey, integrationKey));

  await logAuditEvent({
    action: "integration.notes_updated",
    entityType: "integration_settings",
    entityId: integrationKey,
    summary: `Updated notes for ${integrationKey}`,
  });

  revalidatePath("/settings/integrations");
}
