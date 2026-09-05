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
}) {
  const session = await auth();
  await getDb()
    .insert(auditLog)
    .values({
      actorEmail: session?.user?.email ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      summary: params.summary,
    });
}
