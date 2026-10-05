import { getDb } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { auth } from "@/auth";

// Phase 4, Session 7 — the single write path for the communication
// security audit trail (spec #13: message creation, template changes,
// consent changes, channel status changes, integration changes). Call
// this from a server action right after the write it's describing
// succeeds; never call it speculatively before the write is confirmed.
export async function logAuditEvent(params: {
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  // Set for events with no staff session — e.g. "client-portal:<clientId>"
  // for actions a client takes in the portal. Otherwise the signed-in
  // staff member's email is recorded.
  actor?: string;
}) {
  const actor = params.actor ?? (await auth())?.user?.email ?? null;
  await getDb()
    .insert(auditLog)
    .values({
      actorEmail: actor,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      summary: params.summary,
    });
}
